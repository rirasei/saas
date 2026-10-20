import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { ISubscriptionRepository } from '@/src/features/subscription/domain/repositories/SubscriptionRepository.interface';

export class SaveNoteTitleUseCase {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly subscriptionRepo?: ISubscriptionRepository
  ) {}

  async execute(noteId: string, title: string, userId?: string): Promise<void> {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) {
      throw new Error('노트 제목을 입력해 주세요.');
    }

    if (this.subscriptionRepo && userId) {
      const hasActive = await this.subscriptionRepo.hasActiveSubscription(userId);
      if (!hasActive) {
        throw new Error('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
      }
    }

    await this.noteRepo.saveNoteTitle(noteId, trimmedTitle);
  }
}
