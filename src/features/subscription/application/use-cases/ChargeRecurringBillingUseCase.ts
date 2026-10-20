import { IBillingRepository } from '../../domain/repositories/BillingRepository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { BillingChargeResult, BillingKeyInfo } from '../../domain/models/Billing';

export interface ChargeRecurringBillingParams {
  userId: string;
  amount?: number;
  orderName?: string;
}

export class ChargeRecurringBillingUseCase {
  constructor(
    private readonly billingRepo: IBillingRepository,
    private readonly subRepo: ISubscriptionRepository
  ) {}

  async execute(params: ChargeRecurringBillingParams): Promise<BillingChargeResult> {
    const { userId, amount: customAmount, orderName: customOrderName } = params;

    if (!userId) {
      throw new Error('사용자 ID가 필요합니다.');
    }

    // 1. 저장된 빌링키 정보 조회
    const billingInfo = await this.billingRepo.getBillingInfo(userId);
    if (!billingInfo || !billingInfo.billingKey) {
      throw new Error('등록된 자동결제 수단(빌링키)을 찾을 수 없습니다.');
    }

    // 2. 현재 사용자의 구독 정보 조회
    const subscription = await this.subRepo.getSubscriptionByUserId(userId);
    const plan = subscription?.plan || 'PRO';

    // 3. 결제 금액 산정 (기본 Pro 94,800원 / Team 230,400원)
    const amount = customAmount ?? (plan === 'TEAM' ? 230400 : 94800);
    const cycleDays = billingInfo.cycleDays || 30;

    const orderId = `order_renew_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderName =
      customOrderName || `CloudNote ${plan} 정기 갱신 결제 (${cycleDays}일 주기)`;

    // 4. 토스페이먼츠 빌링 결제 승인 API 호출
    const receipt = await this.billingRepo.chargeBilling({
      billingKey: billingInfo.billingKey,
      customerKey: billingInfo.customerKey,
      amount,
      orderId,
      orderName,
    });

    // 5. 다음 결제일 30일 연장 계산
    const now = new Date();
    const nextBillingDate = new Date(
      now.getTime() + cycleDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const updatedBillingInfo: BillingKeyInfo = {
      ...billingInfo,
      nextBillingDate,
    };
    await this.billingRepo.saveBillingInfo(userId, updatedBillingInfo);

    // 6. 구독 기간 연장
    await this.subRepo.activateSubscription({
      userId,
      orderId,
      amount,
      plan,
      billingCycle: 'MONTHLY',
      receiptUrl: receipt.receiptUrl,
    });

    return {
      success: true,
      orderId,
      orderName,
      amount,
      paidAt: receipt.approvedAt || now.toISOString(),
      receiptUrl: receipt.receiptUrl,
      billingKey: billingInfo.billingKey,
      nextBillingDate,
      card: {
        company: billingInfo.cardCompany,
        number: billingInfo.cardNumberMasked,
        cardType: billingInfo.cardType,
      },
    };
  }
}
