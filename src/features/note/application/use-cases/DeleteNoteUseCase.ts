import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { ISubscriptionRepository } from '@/src/features/subscription/domain/repositories/SubscriptionRepository.interface';

export class DeleteNoteUseCase {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly subscriptionRepo?: ISubscriptionRepository
  ) {}

  async execute(noteId: string, userId?: string): Promise<void> {
    if (!noteId || noteId.trim() === '') {
      throw new Error('노트 ID가 유효하지 않습니다.');
    }

    if (this.subscriptionRepo && userId) {
      const hasActive = await this.subscriptionRepo.hasActiveSubscription(userId);
      if (!hasActive) {
        throw new Error('결제가 완료된 회원만 노트를 삭제할 수 있습니다. 요금제 결제를 완료해 주세요.');
      }
    }

    await this.noteRepo.deleteNote(noteId);
  }
}
