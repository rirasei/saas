import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RecordPaymentStateUseCase } from './RecordPaymentStateUseCase';
import { ISubscriptionRepository, ActivateSubscriptionParams } from '../../domain/repositories/SubscriptionRepository.interface';
import { Subscription } from '../../domain/models/Subscription';
import { PaymentAttemptRecord } from '../../domain/models/PaymentState';

class MockSubscriptionRepository implements ISubscriptionRepository {
  public subscription: Subscription | null = null;
  public recordedAttempts: PaymentAttemptRecord[] = [];
  public cancelReasons: string[] = [];

  async getSubscriptionByUserId(_userId: string): Promise<Subscription | null> {
    return this.subscription;
  }

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    this.subscription = {
      id: 'sub-active-1',
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

  async hasActiveSubscription(userId: string): Promise<boolean> {
    return this.subscription?.userId === userId && this.subscription?.status === 'ACTIVE';
  }

  async recordPaymentAttempt(record: PaymentAttemptRecord): Promise<void> {
    this.recordedAttempts.push(record);
  }

  async cancelSubscription(_userId: string, reason?: string): Promise<void> {
    this.cancelReasons.push(reason || '사용자 취소');
    if (this.subscription) {
      this.subscription.status = 'CANCELED';
    } else {
      this.subscription = {
        id: 'sub-canceled-1',
        workspaceId: 'ws-1',
        userId: _userId,
        plan: 'PRO',
        billingCycle: 'YEARLY',
        status: 'CANCELED',
        aiCreditLimit: 0,
        aiCreditUsed: 0,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date().toISOString(),
      };
    }
  }

  async createPendingPayment(): Promise<PaymentAttemptRecord> {
    return {} as PaymentAttemptRecord;
  }

  async getPendingPayment(): Promise<PaymentAttemptRecord | null> {
    return null;
  }
  async getPaymentTransactions(): Promise<any[]> { return []; }
  async getUserSubscriptionDetails(): Promise<any> { return { subscription: null, transactions: [], isAlreadyPaid: false }; }
  async resumeSubscription(): Promise<void> {}
  async refundPayment(): Promise<void> {}
}

describe('RecordPaymentStateUseCase', () => {
  test('사용자가 의도적으로 취소한 경우 상태를 CANCELED로 기록하고 구독을 취소 상태로 처리한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new RecordPaymentStateUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-123',
      orderId: 'order_pro_yearly_123',
      amount: 94800,
      state: 'CANCELED',
      code: 'PAY_PROCESS_CANCELED',
      message: '사용자에 의해 결제창이 닫혔습니다.',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'CANCELED');
    assert.strictEqual(result.subscriptionStatus, 'CANCELED');
    assert.strictEqual(repo.recordedAttempts.length, 1);
    assert.strictEqual(repo.recordedAttempts[0].state, 'CANCELED');
    assert.strictEqual(repo.recordedAttempts[0].code, 'PAY_PROCESS_CANCELED');
    assert.strictEqual(repo.cancelReasons.length, 1);
  });

  test('결제 시도 중 실패한 경우 상태를 FAILED로 기록하고 오류 코드와 사유를 보존한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new RecordPaymentStateUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-123',
      orderId: 'order_team_monthly_456',
      amount: 24000,
      state: 'FAILED',
      code: 'REJECT_CARD_COMPANY',
      message: '카드 한도 초과로 결제가 거절되었습니다.',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'FAILED');
    assert.notStrictEqual(result.subscriptionStatus, 'ACTIVE');
    assert.strictEqual(repo.recordedAttempts.length, 1);
    assert.strictEqual(repo.recordedAttempts[0].state, 'FAILED');
    assert.strictEqual(repo.recordedAttempts[0].code, 'REJECT_CARD_COMPANY');
    assert.strictEqual(repo.recordedAttempts[0].plan, 'TEAM');
    assert.strictEqual(repo.recordedAttempts[0].billingCycle, 'MONTHLY');
  });

  test('결제에 성공한 경우 상태를 SUCCESS로 기록하고 구독을 ACTIVE 상태로 활성화한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new RecordPaymentStateUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-123',
      orderId: 'order_pro_yearly_789',
      amount: 94800,
      state: 'SUCCESS',
      receiptUrl: 'https://dashboard.tosspayments.com/receipt/test',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'SUCCESS');
    assert.strictEqual(result.subscriptionStatus, 'ACTIVE');
    assert.strictEqual(repo.recordedAttempts.length, 1);
    assert.strictEqual(repo.recordedAttempts[0].state, 'SUCCESS');
    assert.strictEqual(repo.subscription?.status, 'ACTIVE');
  });

  test('필수 파라미터(userId 또는 orderId)가 누락되면 에러를 던진다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new RecordPaymentStateUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: '',
          orderId: 'order_123',
          amount: 94800,
          state: 'CANCELED',
        });
      },
      {
        message: '사용자 ID는 필수입니다.',
      }
    );

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: 'user-123',
          orderId: '',
          amount: 94800,
          state: 'FAILED',
        });
      },
      {
        message: '주문 ID는 필수입니다.',
      }
    );
  });

  test('결제 시작 시 PENDING 상태로 기록되면 구독은 비활성 상태로 유지된다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new RecordPaymentStateUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-123',
      orderId: 'order_pro_yearly_pending_999',
      amount: 94800,
      state: 'PENDING',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'PENDING');
    assert.notStrictEqual(result.subscriptionStatus, 'ACTIVE');
    assert.strictEqual(repo.recordedAttempts.length, 1);
    assert.strictEqual(repo.recordedAttempts[0].state, 'PENDING');
  });
});
