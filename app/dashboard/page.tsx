import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/src/shared/lib/supabase/server';
import { SupabaseDashboardRepository } from '@/src/features/dashboard/infrastructure/repositories/SupabaseDashboardRepository';
import { GetDashboardDataUseCase } from '@/src/features/dashboard/application/use-cases/GetDashboardDataUseCase';
import { DashboardView } from '@/src/features/dashboard/presentation/components/DashboardView';

import { connection } from 'next/server';

export const metadata = {
  title: '대시보드 - CloudNote',
  description: '워크스페이스 대시보드 - 실시간 동기화 및 최근 작업 현황',
};

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?mode=login&next=/dashboard');
  }

  const repo = new SupabaseDashboardRepository(supabase);
  const getDashboardDataUseCase = new GetDashboardDataUseCase(repo);
  const dashboardData = await getDashboardDataUseCase.execute(user.id);

  return <DashboardView initialData={dashboardData} />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              워크스페이스를 불러오는 중입니다...
            </span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
