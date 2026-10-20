import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ChargeRecurringBillingUseCase } from './ChargeRecurringBillingUseCase';
import { IBillingRepository, ChargeBillingParams, IssueBillingKeyParams } from '../../domain/repositories/BillingRepository.interface';
import { ISubscriptionRepository, ActivateSubscriptionParams } from '../../domain/repositories/SubscriptionRepository.interface';
import { BillingKeyInfo } from '../../domain/models/Billing';
import { PaymentReceipt } from '../../domain/models/Payment';
import { Subscription } from '../../domain/models/Subscription';

class MockBillingRepository implements IBillingRepository {
  public savedBillingInfo: Record<string, BillingKeyInfo> = {};
  public chargeCallCount = 0;

  async issueBillingKey(params: IssueBillingKeyParams): Promise<BillingKeyInfo> {
    return {
      billingKey: 'test_billing_key',
      customerKey: params.customerKey,
      authenticatedAt: new Date().toISOString(),
      cycleDays: 30,
    };
  }

  async chargeBilling(params: ChargeBillingParams): Promise<PaymentReceipt> {
    this.chargeCallCount++;
    return {
      paymentKey: 'pay_recurring_' + Date.now(),
      orderId: params.orderId,
      orderName: params.orderName,
      status: 'DONE',
      totalAmount: params.amount,
      method: '카드',
      approvedAt: new Date().toISOString(),
      receiptUrl: 'https://dashboard.tosspayments.com/sales-slip?tx=rec',
      card: {
        number: '43301234****123*',
        cardType: '신용',
        approveNo: '00000000',
      },
    };
  }

  async saveBillingInfo(userId: string, billingInfo: BillingKeyInfo): Promise<void> {
    this.savedBillingInfo[userId] = billingInfo;
  }

  async getBillingInfo(userId: string): Promise<BillingKeyInfo | null> {
    return this.savedBillingInfo[userId] || null;
  }

  async findDueBillings(): Promise<any[]> {
    return [];
  }
}

class MockSubscriptionRepository implements Partial<ISubscriptionRepository> {
  public currentSub: Subscription | null = null;
  public renewCallCount = 0;

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return this.currentSub;
  }

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    this.renewCallCount++;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.currentSub = {
      id: 'sub_123',
      workspaceId: 'ws_123',
      userId: params.userId,
      plan: params.plan,
      billingCycle: params.billingCycle,
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };
    return this.currentSub;
  }
}

describe('ChargeRecurringBillingUseCase', () => {
  it('저장된 빌링키로 결제 엔드포인트를 실행하여 정기 결제를 정상 실행하고 구독 기간을 30일 연장한다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();

    // 초기 빌링키 정보 주입
    billingRepo.savedBillingInfo['user_kim_123'] = {
      billingKey: 'billing_key_existing_999',
      customerKey: 'user_kim_123',
      cardCompany: '현대',
      cardNumberMasked: '43301234****123*',
      authenticatedAt: new Date().toISOString(),
      cycleDays: 30,
      nextBillingDate: new Date().toISOString(),
    };

    // 기존 구독 정보 주입
    subRepo.currentSub = {
      id: 'sub_123',
      workspaceId: 'ws_123',
      userId: 'user_kim_123',
      plan: 'PRO',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
    };

    const useCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    const result = await useCase.execute({
      userId: 'user_kim_123',
      amount: 94800,
      orderName: 'CloudNote Pro 정기 갱신 (30일)',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(billingRepo.chargeCallCount, 1);
    assert.strictEqual(subRepo.renewCallCount, 1);
    assert.strictEqual(result.billingKey, 'billing_key_existing_999');
    assert.strictEqual(result.amount, 94800);
    assert.ok(result.nextBillingDate);

    // 다음 결제일이 약 30일 뒤인지 확인
    const nextDate = new Date(result.nextBillingDate);
    const diffDays = Math.round((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    assert.ok(diffDays >= 29 && diffDays <= 31);
  });

  it('빌링키가 없는 사용자가 정기 결제를 호출하면 에러를 던진다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const useCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: 'non_existing_user',
        });
      },
      { message: '등록된 자동결제 수단(빌링키)을 찾을 수 없습니다.' }
    );
  });
});
