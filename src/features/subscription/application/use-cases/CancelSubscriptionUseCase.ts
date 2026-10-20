import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { IBillingRepository } from '../../domain/repositories/BillingRepository.interface';

export class CancelSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly billingRepo?: IBillingRepository
  ) {}

  async execute(userId: string, reason?: string): Promise<void> {
    if (!userId) {
      throw new Error('사용자 ID가 필요합니다.');
    }

    if (this.billingRepo?.deleteBillingInfo) {
      await this.billingRepo.deleteBillingInfo(userId);
    }

    await this.subscriptionRepo.cancelSubscription(userId, reason);
  }
}

