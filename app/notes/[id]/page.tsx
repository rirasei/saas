import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/src/shared/lib/supabase/server';
import { NoteEditorView } from '@/src/features/note/presentation/components/NoteEditorView';

interface NotePageProps {
  params: Promise<{ id: string }>;
}

async function NoteContent({ params }: NotePageProps) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/notes/${id}`)}`);
  }

  const { data: userProfile } = (await supabase
    .from('user')
    .select('*')
    .eq('id', user.id)
    .single()) as unknown as {
    data: { name?: string | null; email?: string | null; avatar_url?: string | null } | null;
  };

  // Check Supabase subscription status directly
  const { SupabaseSubscriptionRepository } = await import(
    '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository'
  );
  const { CheckNotePermissionUseCase } = await import(
    '@/src/features/subscription/application/use-cases/CheckNotePermissionUseCase'
  );
  const subRepo = new SupabaseSubscriptionRepository();
  const checkUseCase = new CheckNotePermissionUseCase(subRepo);
  const perm = await checkUseCase.execute(user.id);
  const hasPermission = perm.canRead;

  const { SupabaseNoteRepository } = await import(
    '@/src/features/note/infrastructure/repositories/SupabaseNoteRepository'
  );
  const { GetNoteDetailUseCase } = await import(
    '@/src/features/note/application/use-cases/GetNoteDetailUseCase'
  );

  const noteRepo = new SupabaseNoteRepository(supabase);
  const getNoteDetailUseCase = new GetNoteDetailUseCase(noteRepo);
  const note =
    (await getNoteDetailUseCase.execute(id, user.id)) ||
    (await noteRepo.getNoteById('new', user.id))!;

  return (
    <NoteEditorView
      initialNote={note}
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

export default function NotePage(props: NotePageProps) {
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
      <NoteContent {...props} />
    </Suspense>
  );
}
