import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { UserSubscriptionDetails } from '../../domain/models/Subscription';

export class GetUserSubscriptionDetailsUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(userId: string): Promise<UserSubscriptionDetails> {
    if (!userId || userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }

    const details = await this.subscriptionRepo.getUserSubscriptionDetails(userId);

    return {
      subscription: details.subscription,
      transactions: details.transactions || [],
      isAlreadyPaid: details.subscription?.status === 'ACTIVE',
    };
  }
}
