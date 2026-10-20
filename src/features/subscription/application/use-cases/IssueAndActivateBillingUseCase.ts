import { IBillingRepository } from '../../domain/repositories/BillingRepository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { BillingChargeResult, BillingKeyInfo } from '../../domain/models/Billing';

export interface IssueAndActivateBillingParams {
  userId: string;
  authKey: string;
  customerKey: string;
  plan: 'PRO' | 'TEAM';
  amount: number;
  customerEmail?: string;
  customerName?: string;
}

export class IssueAndActivateBillingUseCase {
  constructor(
    private readonly billingRepo: IBillingRepository,
    private readonly subRepo: ISubscriptionRepository
  ) {}

  async execute(params: IssueAndActivateBillingParams): Promise<BillingChargeResult> {
    const { userId, authKey, customerKey, plan, amount, customerEmail, customerName } = params;

    if (!userId) {
      throw new Error('사용자 ID가 필요합니다.');
    }
    if (!authKey) {
      throw new Error('인증 키(authKey)가 필요합니다.');
    }
    if (!customerKey) {
      throw new Error('고객 키(customerKey)가 필요합니다.');
    }

    // 1. 토스페이먼츠 API로 빌링키 발급
    const issuedInfo = await this.billingRepo.issueBillingKey({ authKey, customerKey });

    // 2. 기본 결제 주기 30일 설정 및 다음 결제일 계산
    const cycleDays = 30;
    const now = new Date();
    const nextBillingDate = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000).toISOString();

    const billingInfo: BillingKeyInfo = {
      ...issuedInfo,
      cycleDays,
      nextBillingDate,
    };

    // 3. 데이터베이스에 빌링키 및 카드 정보 저장
    await this.billingRepo.saveBillingInfo(userId, billingInfo);

    // 4. 빌링키로 최초 1회 결제 즉시 승인
    const orderId = `order_billing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderName = `CloudNote ${plan} 정기 구독 (30일 주기)`;

    const receipt = await this.billingRepo.chargeBilling({
      billingKey: billingInfo.billingKey,
      customerKey,
      amount,
      orderId,
      orderName,
      customerEmail,
      customerName,
    });

    // 5. 결제 성공 후 구독 활성화 (30일 주기)
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
