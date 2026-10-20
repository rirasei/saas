import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';

export class RefundPaymentUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(userId: string, orderNumber: string, reason?: string): Promise<void> {
    if (!userId) {
      throw new Error('사용자 ID가 필요합니다.');
    }
    if (!orderNumber) {
      throw new Error('주문 번호가 필요합니다.');
    }

    await this.subscriptionRepo.refundPayment(userId, orderNumber, reason);
  }
}
