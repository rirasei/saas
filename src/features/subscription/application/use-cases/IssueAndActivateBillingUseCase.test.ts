import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IssueAndActivateBillingUseCase } from './IssueAndActivateBillingUseCase';
import { IBillingRepository, IssueBillingKeyParams, ChargeBillingParams } from '../../domain/repositories/BillingRepository.interface';
import { ISubscriptionRepository, ActivateSubscriptionParams } from '../../domain/repositories/SubscriptionRepository.interface';
import { BillingKeyInfo } from '../../domain/models/Billing';
import { PaymentReceipt } from '../../domain/models/Payment';
import { Subscription } from '../../domain/models/Subscription';

class MockBillingRepository implements IBillingRepository {
  public savedBillingInfo: Record<string, BillingKeyInfo> = {};
  public issuedBillingKey = 'test_billing_key_xyz123';

  async issueBillingKey(params: IssueBillingKeyParams): Promise<BillingKeyInfo> {
    return {
      billingKey: this.issuedBillingKey,
      customerKey: params.customerKey,
      cardCompany: '현대',
      cardNumberMasked: '43301234****123*',
      cardType: '신용',
      authenticatedAt: new Date().toISOString(),
      cycleDays: 30,
    };
  }

  async chargeBilling(params: ChargeBillingParams): Promise<PaymentReceipt> {
    return {
      paymentKey: 'test_payment_key_' + Date.now(),
      orderId: params.orderId,
      orderName: params.orderName,
      status: 'DONE',
      totalAmount: params.amount,
      method: '카드',
      approvedAt: new Date().toISOString(),
      receiptUrl: 'https://dashboard.tosspayments.com/sales-slip?tx=123',
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
  public activatedSub: Subscription | null = null;

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.activatedSub = {
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
    return this.activatedSub;
  }
}

describe('IssueAndActivateBillingUseCase', () => {
  it('빌링키를 정상 발급받고 DB에 30일 주기와 함께 저장한 뒤 첫 회 결제를 승인하고 구독을 활성화한다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const useCase = new IssueAndActivateBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    const result = await useCase.execute({
      userId: 'user_kim_123',
      authKey: 'auth_key_test_abc',
      customerKey: 'user_kim_123',
      plan: 'PRO',
      amount: 94800,
      customerEmail: 'tougheye@naver.com',
      customerName: '김형익',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.billingKey, 'test_billing_key_xyz123');
    assert.strictEqual(result.amount, 94800);
    assert.strictEqual(result.card?.company, '현대');

    // DB에 저장된 빌링 정보 확인
    const saved = billingRepo.savedBillingInfo['user_kim_123'];
    assert.ok(saved);
    assert.strictEqual(saved.billingKey, 'test_billing_key_xyz123');
    assert.strictEqual(saved.cycleDays, 30);
    assert.ok(saved.nextBillingDate);

    // 구독 활성화 확인 (기본 결제 주기 30일)
    assert.strictEqual(subRepo.activatedSub?.status, 'ACTIVE');
    assert.strictEqual(subRepo.activatedSub?.plan, 'PRO');
  });

  it('필수 파라미터가 없으면 에러를 던진다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const useCase = new IssueAndActivateBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: '',
          authKey: 'auth',
          customerKey: 'cust',
          plan: 'PRO',
          amount: 94800,
        });
      },
      { message: '사용자 ID가 필요합니다.' }
    );
  });
});
