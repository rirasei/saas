import {
  ISubscriptionRepository,
  CreatePendingPaymentParams,
} from '../../domain/repositories/SubscriptionRepository.interface';
import { PaymentAttemptRecord } from '../../domain/models/PaymentState';

export interface CreatePendingPaymentResult {
  success: boolean;
  pendingRecord: PaymentAttemptRecord;
}

export class CreatePendingPaymentUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(params: CreatePendingPaymentParams): Promise<CreatePendingPaymentResult> {
    const { userId, orderId, amount, plan, billingCycle, workspaceId } = params;

    if (!userId || userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }
    if (!orderId || orderId.trim() === '') {
      throw new Error('주문 ID는 필수입니다.');
    }
    if (!amount || amount <= 0) {
      throw new Error('결제 금액은 0원보다 커야 합니다.');
    }

    const pendingRecord = await this.subscriptionRepo.createPendingPayment({
      userId,
      workspaceId,
      orderId,
      amount,
      plan,
      billingCycle,
    });

    return {
      success: true,
      pendingRecord,
    };
  }
}
