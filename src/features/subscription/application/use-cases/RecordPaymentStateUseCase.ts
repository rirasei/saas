import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { SubscriptionPlan, BillingCycle, SubscriptionStatus } from '../../domain/models/Subscription';
import { PaymentAttemptState } from '../../domain/models/PaymentState';

export interface RecordPaymentStateParams {
  userId: string;
  orderId: string;
  amount: number;
  state: PaymentAttemptState;
  workspaceId?: string;
  code?: string;
  message?: string;
  receiptUrl?: string;
}

export interface RecordPaymentStateResult {
  success: boolean;
  state: PaymentAttemptState;
  subscriptionStatus: SubscriptionStatus;
}

export class RecordPaymentStateUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(params: RecordPaymentStateParams): Promise<RecordPaymentStateResult> {
    const { userId, orderId, amount, state, workspaceId, code, message, receiptUrl } = params;

    if (!userId) {
      throw new Error('사용자 ID는 필수입니다.');
    }
    if (!orderId) {
      throw new Error('주문 ID는 필수입니다.');
    }

    // Infer plan and billing cycle from orderId or fallback to Pro Yearly
    let plan: SubscriptionPlan = 'PRO';
    if (orderId.toLowerCase().includes('team')) {
      plan = 'TEAM';
    } else if (orderId.toLowerCase().includes('starter')) {
      plan = 'STARTER';
    }

    let billingCycle: BillingCycle = 'YEARLY';
    if (orderId.toLowerCase().includes('monthly')) {
      billingCycle = 'MONTHLY';
    }

    // 1. Record payment attempt
    await this.subscriptionRepo.recordPaymentAttempt({
      userId,
      workspaceId,
      orderId,
      amount,
      state,
      plan,
      billingCycle,
      code,
      message,
      receiptUrl,
      createdAt: new Date().toISOString(),
    });

    let subscriptionStatus: SubscriptionStatus = 'TRIALING';

    if (state === 'SUCCESS') {
      const sub = await this.subscriptionRepo.activateSubscription({
        userId,
        workspaceId,
        plan,
        billingCycle,
        orderId,
        amount,
        receiptUrl,
      });
      subscriptionStatus = sub.status;
    } else if (state === 'CANCELED') {
      await this.subscriptionRepo.cancelSubscription(
        userId,
        message || '사용자에 의해 결제가 취소되었습니다.'
      );
      subscriptionStatus = 'CANCELED';
    } else {
      // FAILED
      const currentSub = await this.subscriptionRepo.getSubscriptionByUserId(userId);
      subscriptionStatus = currentSub?.status || 'TRIALING';
    }

    return {
      success: true,
      state,
      subscriptionStatus,
    };
  }
}
