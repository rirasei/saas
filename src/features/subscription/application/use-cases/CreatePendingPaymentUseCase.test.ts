import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CreatePendingPaymentUseCase } from './CreatePendingPaymentUseCase';
import {
  ISubscriptionRepository,
  ActivateSubscriptionParams,
  CreatePendingPaymentParams,
} from '../../domain/repositories/SubscriptionRepository.interface';
import { Subscription } from '../../domain/models/Subscription';
import { PaymentAttemptRecord } from '../../domain/models/PaymentState';

class MockSubscriptionRepository implements ISubscriptionRepository {
  public pendingPayments: Map<string, PaymentAttemptRecord> = new Map();
  public subscription: Subscription | null = null;

  async getSubscriptionByUserId(): Promise<Subscription | null> {
    return this.subscription;
  }

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    this.subscription = {
      id: 'sub-1',
      workspaceId: params.workspaceId || 'ws-1',
      userId: params.userId,
      plan: params.plan,
      billingCycle: params.billingCycle,
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
    };
    return this.subscription;
  }

  async hasActiveSubscription(): Promise<boolean> {
    return this.subscription?.status === 'ACTIVE';
  }

  async recordPaymentAttempt(): Promise<void> {}

  async createPendingPayment(params: CreatePendingPaymentParams): Promise<PaymentAttemptRecord> {
    const record: PaymentAttemptRecord = {
      userId: params.userId,
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      amount: params.amount,
      state: 'PENDING',
      plan: params.plan,
      billingCycle: params.billingCycle,
      createdAt: new Date().toISOString(),
    };
    this.pendingPayments.set(params.orderId, record);
    return record;
  }

  async getPendingPayment(orderId: string): Promise<PaymentAttemptRecord | null> {
    return this.pendingPayments.get(orderId) || null;
  }

  async cancelSubscription(): Promise<void> {}
  async getPaymentTransactions(): Promise<any[]> { return []; }
  async getUserSubscriptionDetails(): Promise<any> { return { subscription: null, transactions: [], isAlreadyPaid: false }; }
  async resumeSubscription(): Promise<void> {}
  async refundPayment(): Promise<void> {}
}

describe('CreatePendingPaymentUseCase', () => {
  test('결제 시작 시 PENDING 상태의 결제 대기 레코드를 정상 생성한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new CreatePendingPaymentUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-123',
      orderId: 'order_pro_yearly_001',
      amount: 94800,
      plan: 'PRO',
      billingCycle: 'YEARLY',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.pendingRecord.state, 'PENDING');
    assert.strictEqual(result.pendingRecord.orderId, 'order_pro_yearly_001');
    assert.strictEqual(result.pendingRecord.amount, 94800);
    assert.strictEqual(result.pendingRecord.plan, 'PRO');

    // DB에 PENDING 레코드가 저장되었는지 확인
    const saved = await repo.getPendingPayment('order_pro_yearly_001');
    assert.notStrictEqual(saved, null);
    assert.strictEqual(saved?.state, 'PENDING');

    // 결제 대기 상태에서는 아직 구독이 활성화되지 않아야 함
    const hasActive = await repo.hasActiveSubscription();
    assert.strictEqual(hasActive, false);
  });

  test('사용자 ID가 없으면 에러를 던진다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new CreatePendingPaymentUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: '',
          orderId: 'order_pro_yearly_002',
          amount: 94800,
          plan: 'PRO',
          billingCycle: 'YEARLY',
        });
      },
      {
        message: '사용자 ID는 필수입니다.',
      }
    );
  });

  test('주문 ID가 없으면 에러를 던진다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new CreatePendingPaymentUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: 'user-123',
          orderId: '',
          amount: 94800,
          plan: 'PRO',
          billingCycle: 'YEARLY',
        });
      },
      {
        message: '주문 ID는 필수입니다.',
      }
    );
  });

  test('결제 금액이 0원 이하이면 에러를 던진다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new CreatePendingPaymentUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: 'user-123',
          orderId: 'order_pro_yearly_003',
          amount: 0,
          plan: 'PRO',
          billingCycle: 'YEARLY',
        });
      },
      {
        message: '결제 금액은 0원보다 커야 합니다.',
      }
    );
  });
});
