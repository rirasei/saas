import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GetUserSubscriptionDetailsUseCase } from './GetUserSubscriptionDetailsUseCase';
import {
  ISubscriptionRepository,
  ActivateSubscriptionParams,
  CreatePendingPaymentParams,
} from '../../domain/repositories/SubscriptionRepository.interface';
import {
  Subscription,
  PaymentTransactionRecord,
  UserSubscriptionDetails,
} from '../../domain/models/Subscription';
import { PaymentAttemptRecord } from '../../domain/models/PaymentState';

class MockSubscriptionRepository implements ISubscriptionRepository {
  public subscription: Subscription | null = null;
  public transactions: PaymentTransactionRecord[] = [];

  async getSubscriptionByUserId(): Promise<Subscription | null> {
    return this.subscription;
  }
  async activateSubscription(_params: ActivateSubscriptionParams): Promise<Subscription> {
    throw new Error();
  }
  async hasActiveSubscription(): Promise<boolean> {
    return this.subscription?.status === 'ACTIVE';
  }
  async recordPaymentAttempt(): Promise<void> {}
  async createPendingPayment(_params: CreatePendingPaymentParams): Promise<PaymentAttemptRecord> {
    throw new Error();
  }
  async getPendingPayment(): Promise<PaymentAttemptRecord | null> {
    return null;
  }
  async cancelSubscription(): Promise<void> {}

  async getPaymentTransactions(): Promise<PaymentTransactionRecord[]> {
    return this.transactions;
  }

  async getUserSubscriptionDetails(): Promise<UserSubscriptionDetails> {
    return {
      subscription: this.subscription,
      transactions: this.transactions,
      isAlreadyPaid: this.subscription?.status === 'ACTIVE',
    };
  }

  async resumeSubscription(): Promise<void> {}
  async refundPayment(): Promise<void> {}
}

describe('GetUserSubscriptionDetailsUseCase', () => {
  test('사용자의 현재 구독 정보와 결제 거래 내역을 정상적으로 조회한다', async () => {
    const repo = new MockSubscriptionRepository();
    repo.subscription = {
      id: 'sub-active-1',
      workspaceId: 'ws-1',
      userId: 'user-123',
      plan: 'PRO',
      billingCycle: 'YEARLY',
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 12,
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2027-10-15T00:00:00Z',
    };
    repo.transactions = [
      {
        id: 'txn-1',
        orderNumber: 'order_pro_yearly_123',
        amount: 86182,
        vat: 8618,
        totalAmount: 94800,
        currency: 'KRW',
        method: 'CARD',
        cardProvider: '토스페이먼츠',
        receiptUrl: 'https://tosspayments.com/receipt/test',
        status: 'SUCCESS',
        paidAt: '2026-10-15T00:00:00Z',
        createdAt: '2026-10-15T00:00:00Z',
      },
    ];

    const useCase = new GetUserSubscriptionDetailsUseCase(repo);
    const result = await useCase.execute('user-123');

    assert.strictEqual(result.isAlreadyPaid, true);
    assert.strictEqual(result.subscription?.plan, 'PRO');
    assert.strictEqual(result.subscription?.status, 'ACTIVE');
    assert.strictEqual(result.subscription?.aiCreditUsed, 12);
    assert.strictEqual(result.transactions.length, 1);
    assert.strictEqual(result.transactions[0].orderNumber, 'order_pro_yearly_123');
    assert.strictEqual(result.transactions[0].totalAmount, 94800);
  });

  test('구독 내역이 없는 사용자에게는 null 구독과 빈 거래 내역을 반환한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new GetUserSubscriptionDetailsUseCase(repo);

    const result = await useCase.execute('user-new-1');

    assert.strictEqual(result.isAlreadyPaid, false);
    assert.strictEqual(result.subscription, null);
    assert.strictEqual(result.transactions.length, 0);
  });

  test('사용자 ID가 없으면 에러를 던진다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new GetUserSubscriptionDetailsUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute('');
      },
      {
        message: '사용자 ID는 필수입니다.',
      }
    );
  });
});
