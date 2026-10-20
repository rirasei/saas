import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RefundPaymentUseCase } from './RefundPaymentUseCase';
import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';

describe('RefundPaymentUseCase', () => {
  test('주문 번호와 사용자 ID로 결제 취소 및 환불을 정상 처리한다', async () => {
    let refundedUserId = '';
    let refundedOrder = '';
    let refundReason: string | undefined = '';

    const mockRepo: ISubscriptionRepository = {
      getSubscriptionByUserId: async () => null,
      activateSubscription: async () => ({} as any),
      hasActiveSubscription: async () => true,
      recordPaymentAttempt: async () => {},
      createPendingPayment: async () => ({} as any),
      getPendingPayment: async () => null,
      cancelSubscription: async () => {},
      resumeSubscription: async () => {},
      refundPayment: async (userId, orderNumber, reason) => {
        refundedUserId = userId;
        refundedOrder = orderNumber;
        refundReason = reason;
      },
      getPaymentTransactions: async () => [],
      getUserSubscriptionDetails: async () => ({} as any),
    };

    const useCase = new RefundPaymentUseCase(mockRepo);
    await useCase.execute('user-123', 'order_pro_123', '단순 변심 전액 환불');

    assert.strictEqual(refundedUserId, 'user-123');
    assert.strictEqual(refundedOrder, 'order_pro_123');
    assert.strictEqual(refundReason, '단순 변심 전액 환불');
  });

  test('주문 번호가 없으면 에러를 던진다', async () => {
    const mockRepo = {} as ISubscriptionRepository;
    const useCase = new RefundPaymentUseCase(mockRepo);

    await assert.rejects(async () => {
      await useCase.execute('user-123', '');
    }, /주문 번호가 필요합니다/);
  });

  test('사용자 ID가 없으면 에러를 던진다', async () => {
    const mockRepo = {} as ISubscriptionRepository;
    const useCase = new RefundPaymentUseCase(mockRepo);

    await assert.rejects(async () => {
      await useCase.execute('', 'order_123');
    }, /사용자 ID가 필요합니다/);
  });
});
