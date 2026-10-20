import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { Subscription, SubscriptionPlan, BillingCycle } from '../../domain/models/Subscription';

export interface ActivateSubscriptionInput {
  userId: string;
  orderId: string;
  amount: number;
  receiptUrl?: string;
}

export class ActivateSubscriptionUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(input: ActivateSubscriptionInput): Promise<Subscription> {
    const { userId, orderId, amount, receiptUrl } = input;

    if (!userId || userId.trim() === '') {
      throw new Error('사용자 ID가 유효하지 않습니다.');
    }

    if (!orderId || orderId.trim() === '') {
      throw new Error('주문 번호가 유효하지 않습니다.');
    }

    // Infer plan from orderId
    let plan: SubscriptionPlan = 'PRO';
    const lowerOrderId = orderId.toLowerCase();
    if (lowerOrderId.includes('team')) {
      plan = 'TEAM';
    } else if (lowerOrderId.includes('starter')) {
      plan = 'STARTER';
    }

    // Infer billing cycle from orderId
    let billingCycle: BillingCycle = 'YEARLY';
    if (lowerOrderId.includes('monthly')) {
      billingCycle = 'MONTHLY';
    }

    return await this.subscriptionRepo.activateSubscription({
      userId,
      plan,
      billingCycle,
      orderId,
      amount,
      receiptUrl,
    });
  }
}
