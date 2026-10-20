import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ActivateSubscriptionUseCase } from './ActivateSubscriptionUseCase';
import {
  ISubscriptionRepository,
  ActivateSubscriptionParams,
} from '../../domain/repositories/SubscriptionRepository.interface';
import { Subscription } from '../../domain/models/Subscription';

class MockSubscriptionRepository implements ISubscriptionRepository {
  public lastActivatedParams: ActivateSubscriptionParams | null = null;

  async getSubscriptionByUserId(): Promise<Subscription | null> {
    return null;
  }

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    this.lastActivatedParams = params;
    return {
      id: 'sub-new-1',
      workspaceId: params.workspaceId || 'ws-default',
      userId: params.userId,
      plan: params.plan,
      billingCycle: params.billingCycle,
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async hasActiveSubscription(): Promise<boolean> {
    return true;
  }

  async recordPaymentAttempt(): Promise<void> {}
  async cancelSubscription(): Promise<void> {}
  async createPendingPayment(): Promise<any> {
    return {} as any;
  }
  async getPendingPayment(): Promise<any> {
    return null;
  }
  async getPaymentTransactions(): Promise<any[]> { return []; }
  async getUserSubscriptionDetails(): Promise<any> { return { subscription: null, transactions: [], isAlreadyPaid: false }; }
  async resumeSubscription(): Promise<void> {}
  async refundPayment(): Promise<void> {}
}

describe('ActivateSubscriptionUseCase', () => {
  test('토스페이먼츠 연간 결제 완료 정보로 구독을 ACTIVE 상태로 활성화한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new ActivateSubscriptionUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-123',
      orderId: 'order_pro_yearly_1791234567890',
      amount: 94800,
      receiptUrl: 'https://tosspayments.com/receipt/sample',
    });

    assert.strictEqual(result.status, 'ACTIVE');
    assert.strictEqual(result.plan, 'PRO');
    assert.strictEqual(result.billingCycle, 'YEARLY');
    assert.strictEqual(repo.lastActivatedParams?.userId, 'user-123');
    assert.strictEqual(repo.lastActivatedParams?.amount, 94800);
  });

  test('orderId에 team 및 monthly가 포함되어 있으면 TEAM 및 MONTHLY로 활성화한다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new ActivateSubscriptionUseCase(repo);

    const result = await useCase.execute({
      userId: 'user-456',
      orderId: 'order_team_monthly_1791234567891',
      amount: 24000,
    });

    assert.strictEqual(result.status, 'ACTIVE');
    assert.strictEqual(result.plan, 'TEAM');
    assert.strictEqual(result.billingCycle, 'MONTHLY');
  });

  test('userId가 없으면 에러를 던진다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new ActivateSubscriptionUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute({
        userId: '',
        orderId: 'order_pro_yearly_123',
        amount: 94800,
      });
    }, /사용자 ID가 유효하지 않습니다/);
  });
});
