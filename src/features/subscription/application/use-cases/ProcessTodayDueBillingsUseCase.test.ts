import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProcessTodayDueBillingsUseCase } from './ProcessTodayDueBillingsUseCase';
import {
  IBillingRepository,
  ChargeBillingParams,
  IssueBillingKeyParams,
} from '../../domain/repositories/BillingRepository.interface';
import {
  ISubscriptionRepository,
  ActivateSubscriptionParams,
} from '../../domain/repositories/SubscriptionRepository.interface';
import { BillingKeyInfo, DueBillingItem } from '../../domain/models/Billing';
import { PaymentReceipt } from '../../domain/models/Payment';
import { Subscription } from '../../domain/models/Subscription';
import { ChargeRecurringBillingUseCase } from './ChargeRecurringBillingUseCase';

class MockBillingRepository implements IBillingRepository {
  public dueItems: DueBillingItem[] = [];
  public chargedKeys: string[] = [];
  public savedBillingInfo: Record<string, BillingKeyInfo> = {};

  async issueBillingKey(params: IssueBillingKeyParams): Promise<BillingKeyInfo> {
    return {
      billingKey: 'test_key',
      customerKey: params.customerKey,
      authenticatedAt: new Date().toISOString(),
      cycleDays: 30,
    };
  }

  async chargeBilling(params: ChargeBillingParams): Promise<PaymentReceipt> {
    this.chargedKeys.push(params.billingKey);
    if (params.billingKey === 'failing_key') {
      throw new Error('카드 한도 초과로 결제에 실패했습니다.');
    }
    return {
      paymentKey: 'pay_' + params.orderId,
      orderId: params.orderId,
      orderName: params.orderName,
      status: 'DONE',
      totalAmount: params.amount,
      method: '카드',
      approvedAt: new Date().toISOString(),
      receiptUrl: 'https://tosspayments.com/receipt',
    };
  }

  async saveBillingInfo(userId: string, billingInfo: BillingKeyInfo): Promise<void> {
    this.savedBillingInfo[userId] = billingInfo;
  }

  async getBillingInfo(userId: string): Promise<BillingKeyInfo | null> {
    return this.savedBillingInfo[userId] || null;
  }

  async findDueBillings(targetDate: Date = new Date()): Promise<DueBillingItem[]> {
    // 시간과 관계없이 targetDate 당일 또는 이전의 항목만 필터링 (UTC 및 로컬 타임존 호환)
    const targetEndOfDayLocal = new Date(targetDate);
    targetEndOfDayLocal.setHours(23, 59, 59, 999);

    const targetEndOfDayUtc = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    const maxTargetEndOfDay = Math.max(
      targetEndOfDayLocal.getTime(),
      targetEndOfDayUtc.getTime()
    );

    return this.dueItems.filter((item) => {
      const itemDate = new Date(item.nextBillingDate);
      return itemDate.getTime() <= maxTargetEndOfDay;
    });
  }
}

class MockSubscriptionRepository implements Partial<ISubscriptionRepository> {
  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return {
      id: 'sub_' + userId,
      workspaceId: 'ws_' + userId,
      userId,
      plan: 'PRO',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
    };
  }

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    return {
      id: 'sub_' + params.userId,
      workspaceId: 'ws_' + params.userId,
      userId: params.userId,
      plan: params.plan,
      billingCycle: params.billingCycle,
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
  }
}

describe('ProcessTodayDueBillingsUseCase (TDD)', () => {
  it('시간과 관계없이 오늘(또는 오늘 이전) 결제해야 하는 빌링키들을 모두 불러와서 각각 결제를 실행한다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);

    const todayNight = new Date();
    todayNight.setHours(23, 30, 0, 0); // 밤 늦은 시간이더라도 오늘이면 포함

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000); // 어제 결제 누락건도 포함

    // 빌링 정보 세팅
    billingRepo.savedBillingInfo['user_1'] = {
      billingKey: 'billing_key_1',
      customerKey: 'user_1',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: todayNoon.toISOString(),
    };
    billingRepo.savedBillingInfo['user_2'] = {
      billingKey: 'billing_key_2',
      customerKey: 'user_2',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: todayNight.toISOString(),
    };
    billingRepo.savedBillingInfo['user_3'] = {
      billingKey: 'billing_key_3',
      customerKey: 'user_3',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: yesterday.toISOString(),
    };

    billingRepo.dueItems = [
      {
        workspaceId: 'ws_1',
        userId: 'user_1',
        billingKey: 'billing_key_1',
        customerKey: 'user_1',
        nextBillingDate: todayNoon.toISOString(),
        cycleDays: 30,
      },
      {
        workspaceId: 'ws_2',
        userId: 'user_2',
        billingKey: 'billing_key_2',
        customerKey: 'user_2',
        nextBillingDate: todayNight.toISOString(),
        cycleDays: 30,
      },
      {
        workspaceId: 'ws_3',
        userId: 'user_3',
        billingKey: 'billing_key_3',
        customerKey: 'user_3',
        nextBillingDate: yesterday.toISOString(),
        cycleDays: 30,
      },
    ];

    const useCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);
    const result = await useCase.execute();

    assert.strictEqual(result.totalCount, 3);
    assert.strictEqual(result.successCount, 3);
    assert.strictEqual(result.failedCount, 0);
    assert.strictEqual(billingRepo.chargedKeys.length, 3);
    assert.deepStrictEqual(billingRepo.chargedKeys, [
      'billing_key_1',
      'billing_key_2',
      'billing_key_3',
    ]);
  });

  it('내일 이후가 결제 예정일인 빌링키는 대상에서 제외되어 결제되지 않는다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    billingRepo.savedBillingInfo['user_future_1'] = {
      billingKey: 'billing_key_future_1',
      customerKey: 'user_future_1',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: tomorrow.toISOString(),
    };
    billingRepo.savedBillingInfo['user_future_2'] = {
      billingKey: 'billing_key_future_2',
      customerKey: 'user_future_2',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: nextWeek.toISOString(),
    };

    billingRepo.dueItems = [
      {
        workspaceId: 'ws_f1',
        userId: 'user_future_1',
        billingKey: 'billing_key_future_1',
        customerKey: 'user_future_1',
        nextBillingDate: tomorrow.toISOString(),
        cycleDays: 30,
      },
      {
        workspaceId: 'ws_f2',
        userId: 'user_future_2',
        billingKey: 'billing_key_future_2',
        customerKey: 'user_future_2',
        nextBillingDate: nextWeek.toISOString(),
        cycleDays: 30,
      },
    ];

    const useCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);
    const result = await useCase.execute();

    assert.strictEqual(result.totalCount, 0);
    assert.strictEqual(result.successCount, 0);
    assert.strictEqual(result.failedCount, 0);
    assert.strictEqual(billingRepo.chargedKeys.length, 0);
  });

  it('오늘 결제 대상 빌링키가 없으면 0건 성공 결과를 반환한다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    billingRepo.dueItems = [];

    const useCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);
    const result = await useCase.execute();

    assert.strictEqual(result.totalCount, 0);
    assert.strictEqual(result.successCount, 0);
    assert.strictEqual(result.failedCount, 0);
    assert.strictEqual(billingRepo.chargedKeys.length, 0);
  });

  it('일부 빌링키 결제가 실패하더라도 중단되지 않고 다음 결제를 진행하며 실패 내역을 집계한다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    const today = new Date();

    billingRepo.savedBillingInfo['user_ok'] = {
      billingKey: 'billing_key_ok',
      customerKey: 'user_ok',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: today.toISOString(),
    };
    billingRepo.savedBillingInfo['user_fail'] = {
      billingKey: 'failing_key',
      customerKey: 'user_fail',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: today.toISOString(),
    };

    billingRepo.dueItems = [
      {
        workspaceId: 'ws_fail',
        userId: 'user_fail',
        billingKey: 'failing_key',
        customerKey: 'user_fail',
        nextBillingDate: today.toISOString(),
        cycleDays: 30,
      },
      {
        workspaceId: 'ws_ok',
        userId: 'user_ok',
        billingKey: 'billing_key_ok',
        customerKey: 'user_ok',
        nextBillingDate: today.toISOString(),
        cycleDays: 30,
      },
    ];

    const useCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);
    const result = await useCase.execute();

    assert.strictEqual(result.totalCount, 2);
    assert.strictEqual(result.successCount, 1);
    assert.strictEqual(result.failedCount, 1);
    assert.strictEqual(result.results[0].success, false);
    assert.strictEqual(result.results[0].error, '카드 한도 초과로 결제에 실패했습니다.');
    assert.strictEqual(result.results[1].success, true);
    assert.strictEqual(result.results[1].result?.billingKey, 'billing_key_ok');
  });

  it('특정 기준 날짜(targetDate)를 지정하면 해당 날짜 기준으로 오늘 결제 대상 빌링키를 정확히 조회하여 결제한다', async () => {
    const billingRepo = new MockBillingRepository();
    const subRepo = new MockSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(
      billingRepo,
      subRepo as unknown as ISubscriptionRepository
    );

    const specificDate = new Date('2026-11-17T09:00:00.000Z');

    billingRepo.savedBillingInfo['user_nov17'] = {
      billingKey: 'billing_key_nov17',
      customerKey: 'user_nov17',
      cycleDays: 30,
      authenticatedAt: new Date().toISOString(),
      nextBillingDate: '2026-11-17T21:00:00.000Z', // 같은 날 밤
    };

    billingRepo.dueItems = [
      {
        workspaceId: 'ws_nov17',
        userId: 'user_nov17',
        billingKey: 'billing_key_nov17',
        customerKey: 'user_nov17',
        nextBillingDate: '2026-11-17T21:00:00.000Z',
        cycleDays: 30,
      },
      {
        workspaceId: 'ws_nov18',
        userId: 'user_nov18',
        billingKey: 'billing_key_nov18',
        customerKey: 'user_nov18',
        nextBillingDate: '2026-11-18T10:00:00.000Z',
        cycleDays: 30,
      },
    ];

    const useCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);
    const result = await useCase.execute(specificDate);

    assert.strictEqual(result.totalCount, 1);
    assert.strictEqual(result.successCount, 1);
    assert.strictEqual(result.results[0].billingKey, 'billing_key_nov17');
  });
});
