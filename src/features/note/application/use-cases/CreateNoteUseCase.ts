import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { ISubscriptionRepository } from '@/src/features/subscription/domain/repositories/SubscriptionRepository.interface';

export interface CreateNoteInput {
  userId: string;
  workspaceId?: string;
  title: string;
  folderId?: string;
  folderName?: string;
}

export class CreateNoteUseCase {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly subscriptionRepo?: ISubscriptionRepository
  ) {}

  async execute(input: CreateNoteInput): Promise<NoteDetail> {
    const { userId, title, folderId, folderName, workspaceId } = input;

    if (!userId || userId.trim() === '') {
      throw new Error('사용자 ID가 유효하지 않습니다.');
    }

    const trimmedTitle = title ? title.trim() : '';
    if (!trimmedTitle) {
      throw new Error('노트 제목을 입력해 주세요.');
    }

    if (this.subscriptionRepo) {
      const hasActive = await this.subscriptionRepo.hasActiveSubscription(userId);
      if (!hasActive) {
        throw new Error('결제가 완료된 회원만 노트를 생성할 수 있습니다. 요금제 결제를 완료해 주세요.');
      }
    }

    return await this.noteRepo.createNote({
      userId,
      workspaceId,
      title: trimmedTitle,
      folderId,
      folderName,
    });
  }
}
