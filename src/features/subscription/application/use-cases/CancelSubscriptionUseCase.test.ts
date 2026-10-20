import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CancelSubscriptionUseCase } from './CancelSubscriptionUseCase';
import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';

describe('CancelSubscriptionUseCase', () => {
  test('사용자 ID로 구독 중지(해지)를 정상 요청한다', async () => {
    let canceledUserId = '';
    let cancelReason: string | undefined = '';

    const mockRepo: ISubscriptionRepository = {
      getSubscriptionByUserId: async () => null,
      activateSubscription: async () => ({} as any),
      hasActiveSubscription: async () => true,
      recordPaymentAttempt: async () => {},
      createPendingPayment: async () => ({} as any),
      getPendingPayment: async () => null,
      cancelSubscription: async (userId, reason) => {
        canceledUserId = userId;
        cancelReason = reason;
      },
      resumeSubscription: async () => {},
      refundPayment: async () => {},
      getPaymentTransactions: async () => [],
      getUserSubscriptionDetails: async () => ({} as any),
    };

    const useCase = new CancelSubscriptionUseCase(mockRepo);
    await useCase.execute('user-123', '서비스 미사용');

    assert.strictEqual(canceledUserId, 'user-123');
    assert.strictEqual(cancelReason, '서비스 미사용');
  });

  test('구독 취소 시 빌링 저장소가 제공되면 빌링키 및 빌링 정보를 함께 삭제한다', async () => {
    let canceledUserId = '';
    let deletedBillingUserId = '';

    const mockSubRepo: ISubscriptionRepository = {
      getSubscriptionByUserId: async () => null,
      activateSubscription: async () => ({} as any),
      hasActiveSubscription: async () => true,
      recordPaymentAttempt: async () => {},
      createPendingPayment: async () => ({} as any),
      getPendingPayment: async () => null,
      cancelSubscription: async (userId) => {
        canceledUserId = userId;
      },
      resumeSubscription: async () => {},
      refundPayment: async () => {},
      getPaymentTransactions: async () => [],
      getUserSubscriptionDetails: async () => ({} as any),
    };

    const mockBillingRepo = {
      deleteBillingInfo: async (userId: string) => {
        deletedBillingUserId = userId;
      },
    } as any;

    const useCase = new CancelSubscriptionUseCase(mockSubRepo, mockBillingRepo);
    await useCase.execute('user-billing-del');

    assert.strictEqual(canceledUserId, 'user-billing-del');
    assert.strictEqual(deletedBillingUserId, 'user-billing-del');
  });

  test('사용자 ID가 없으면 에러를 던진다', async () => {
    const mockRepo = {} as ISubscriptionRepository;
    const useCase = new CancelSubscriptionUseCase(mockRepo);

    await assert.rejects(async () => {
      await useCase.execute('');
    }, /사용자 ID가 필요합니다/);
  });
});


