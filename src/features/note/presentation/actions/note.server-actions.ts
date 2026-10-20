'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/src/shared/lib/supabase/server';
import { SupabaseNoteRepository } from '../../infrastructure/repositories/SupabaseNoteRepository';
import { DeleteNoteUseCase } from '../../application/use-cases/DeleteNoteUseCase';
import { ToggleNotePinUseCase } from '../../application/use-cases/ToggleNotePinUseCase';
import { SaveNoteTitleUseCase } from '../../application/use-cases/SaveNoteTitleUseCase';
import { CreateNoteUseCase } from '../../application/use-cases/CreateNoteUseCase';
import { SupabaseSubscriptionRepository } from '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository';
import { CheckNotePermissionUseCase } from '@/src/features/subscription/application/use-cases/CheckNotePermissionUseCase';

async function checkPermission(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

  const subRepo = new SupabaseSubscriptionRepository();
  const checkUseCase = new CheckNotePermissionUseCase(subRepo);
  const permission = await checkUseCase.execute(userId);

  return { hasPermission: permission.canCreate, userId };
}

export async function deleteNoteAction(noteId: string) {
  const supabase = await createClient();
  const { hasPermission } = await checkPermission(supabase);

  if (!hasPermission) {
    throw new Error('결제가 완료된 회원만 노트를 삭제할 수 있습니다. 요금제 결제를 완료해 주세요.');
  }

  const repo = new SupabaseNoteRepository(supabase);
  const deleteNoteUseCase = new DeleteNoteUseCase(repo);

  await deleteNoteUseCase.execute(noteId);
  revalidatePath('/notes');
  revalidatePath('/dashboard');
}

export async function toggleNotePinAction(noteId: string, isPinned: boolean) {
  const supabase = await createClient();
  const { hasPermission } = await checkPermission(supabase);

  if (!hasPermission) {
    throw new Error('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
  }

  const repo = new SupabaseNoteRepository(supabase);
  const toggleNotePinUseCase = new ToggleNotePinUseCase(repo);

  await toggleNotePinUseCase.execute(noteId, isPinned);
  revalidatePath('/notes');
  revalidatePath('/dashboard');
}

export async function saveNoteTitleAction(noteId: string, title: string) {
  const supabase = await createClient();
  const { hasPermission } = await checkPermission(supabase);

  if (!hasPermission) {
    throw new Error('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
  }

  const repo = new SupabaseNoteRepository(supabase);
  const saveTitleUseCase = new SaveNoteTitleUseCase(repo);

  await saveTitleUseCase.execute(noteId, title);
  revalidatePath('/notes');
  revalidatePath('/dashboard');
}

export async function toggleChecklistAction(blockId: string, isCompleted: boolean) {
  const supabase = await createClient();
  const { hasPermission } = await checkPermission(supabase);

  if (!hasPermission) {
    throw new Error('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
  }

  const repo = new SupabaseNoteRepository(supabase);
  await repo.toggleChecklist(blockId, isCompleted);
}

export async function createNoteAction(title: string, folderName?: string) {
  const supabase = await createClient();
  const { hasPermission, userId } = await checkPermission(supabase);

  if (!hasPermission) {
    throw new Error('결제가 완료된 회원만 노트를 생성할 수 있습니다. 요금제 결제를 완료해 주세요.');
  }

  const repo = new SupabaseNoteRepository(supabase);
  const subRepo = new SupabaseSubscriptionRepository(supabase);
  const createUseCase = new CreateNoteUseCase(repo, subRepo);

  const newNote = await createUseCase.execute({
    userId: userId || '9ef7444d-159a-4968-b992-7a767995deb2',
    title,
    folderName: folderName || '제품 기획',
  });

  revalidatePath('/notes');
  revalidatePath('/dashboard');
  return newNote;
}
