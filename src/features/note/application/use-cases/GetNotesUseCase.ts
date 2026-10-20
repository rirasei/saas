import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteSummary } from '../../domain/models/NoteSummary';
import { ISubscriptionRepository } from '@/src/features/subscription/domain/repositories/SubscriptionRepository.interface';

export class GetNotesUseCase {
  constructor(
    private readonly noteRepo: INoteRepository,
    private readonly subscriptionRepo?: ISubscriptionRepository
  ) {}

  async execute(userId: string): Promise<NoteSummary[]> {
    if (!userId) {
      throw new Error('사용자 ID가 유효하지 않습니다.');
    }

    if (this.subscriptionRepo) {
      const hasActive = await this.subscriptionRepo.hasActiveSubscription(userId);
      if (!hasActive) {
        throw new Error('결제가 완료된 회원만 노트를 조회할 수 있습니다. 요금제 결제를 완료해 주세요.');
      }
    }

    return await this.noteRepo.getNotes(userId);
  }
}
