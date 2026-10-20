import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/src/shared/lib/supabase/server';
import { StaticLandingRepository } from '@/src/features/landing/infrastructure/repositories/StaticLandingRepository';
import { GetLandingDataUseCase } from '@/src/features/landing/application/use-cases/GetLandingDataUseCase';
import { LandingView } from '@/src/features/landing/presentation/components/LandingView';

async function LandingContent() {
  await connection();
  const landingRepo = new StaticLandingRepository();
  const getLandingDataUseCase = new GetLandingDataUseCase(landingRepo);
  const data = await getLandingDataUseCase.execute();

  let userProfile: { name?: string; email?: string; avatarUrl?: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = (await supabase
        .from('user')
        .select('*')
        .eq('id', user.id)
        .single()) as unknown as { data: { name?: string | null; email?: string | null; avatar_url?: string | null } | null };

      const name =
        profile?.name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '사용자';

      userProfile = {
        name,
        email: profile?.email || user.email || '',
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || undefined,
      };
    }
  } catch {
    // If unauthenticated or offline, proceed with public view
  }

  return <LandingView data={data} user={userProfile} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
