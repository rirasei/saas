import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/src/shared/lib/supabase/server';
import { SupabaseNoteRepository } from '@/src/features/note/infrastructure/repositories/SupabaseNoteRepository';
import { GetNotesUseCase } from '@/src/features/note/application/use-cases/GetNotesUseCase';
import { SupabaseSubscriptionRepository } from '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository';
import { CheckNotePermissionUseCase } from '@/src/features/subscription/application/use-cases/CheckNotePermissionUseCase';
import { NotesListView } from '@/src/features/note/presentation/components/NotesListView';

export const metadata = {
  title: '노트 관리 - CloudNote',
  description: '워크스페이스 내 모든 노트를 검색, 필터링 및 관리하세요.',
};

async function NotesContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?mode=login&next=/notes');
  }

  const { data: userProfile } = (await supabase
    .from('user')
    .select('*')
    .eq('id', user.id)
    .single()) as unknown as {
    data: { name?: string | null; email?: string | null; avatar_url?: string | null } | null;
  };

  // Check Supabase subscription status directly
  const subRepo = new SupabaseSubscriptionRepository();
  const checkUseCase = new CheckNotePermissionUseCase(subRepo);
  const permission = await checkUseCase.execute(user.id);
  const hasPermission = permission.canRead;

  const repo = new SupabaseNoteRepository(supabase);
  const getNotesUseCase = new GetNotesUseCase(repo);
  const notes = await getNotesUseCase.execute(user.id);

  return (
    <NotesListView
      initialNotes={notes}
      hasPermission={hasPermission}
      user={{
        name:
          userProfile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '사용자',
        email: userProfile?.email || user.email || 'user@cloudnote.io',
        avatarUrl: userProfile?.avatar_url || user.user_metadata?.avatar_url || undefined,
      }}
    />
  );
}

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              노트 목록을 불러오는 중입니다...
            </span>
          </div>
        </div>
      }
    >
      <NotesContent />
    </Suspense>
  );
}
