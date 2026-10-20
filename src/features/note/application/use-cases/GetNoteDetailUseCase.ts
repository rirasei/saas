import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { ISubscriptionRepository } from '@/src/features/subscription/domain/repositories/SubscriptionRepository.interface';

export class GetNoteDetailUseCase {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly subscriptionRepo?: ISubscriptionRepository
  ) {}

  async execute(noteId: string, userId: string): Promise<NoteDetail | null> {
    if (!noteId || !userId) {
      return null;
    }

    if (this.subscriptionRepo) {
      const hasActive = await this.subscriptionRepo.hasActiveSubscription(userId);
      if (!hasActive) {
        throw new Error('결제가 완료된 회원만 노트를 조회할 수 있습니다. 요금제 결제를 완료해 주세요.');
      }
    }

    return await this.noteRepo.getNoteById(noteId, userId);
  }
}
