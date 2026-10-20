import { IBillingRepository } from '../../domain/repositories/BillingRepository.interface';
import { ChargeRecurringBillingUseCase } from './ChargeRecurringBillingUseCase';
import { BatchBillingChargeResult } from '../../domain/models/Billing';

export class ProcessTodayDueBillingsUseCase {
  constructor(
    private readonly billingRepo: IBillingRepository,
    private readonly chargeUseCase: ChargeRecurringBillingUseCase
  ) {}

  /**
   * 시간과 관계없이 오늘(또는 지정된 날짜 기준) 결제해야 하는 모든 빌링키를 조회하여
   * 이미 구현된 빌링키 정기 결제 유스케이스(ChargeRecurringBillingUseCase)를 실행합니다.
   *
   * @param targetDate 기준 날짜 (기본값: 오늘)
   * @returns 배치 결제 결과 (총 건수, 성공/실패 건수, 상세 내역)
   */
  async execute(targetDate: Date = new Date()): Promise<BatchBillingChargeResult> {
    // 1. 시간과 관계없이 오늘 결제해야 하는 빌링키를 모두 불러옴
    const dueItems = await this.billingRepo.findDueBillings(targetDate);

    const results: BatchBillingChargeResult['results'] = [];
    let successCount = 0;
    let failedCount = 0;

    // 2. 키를 모두 불러왔으면 이미 구현되어 있는 빌링키 결제 함수를 실행하여 모두 결제
    for (const item of dueItems) {
      try {
        const chargeResult = await this.chargeUseCase.execute({
          userId: item.userId,
        });

        results.push({
          userId: item.userId,
          billingKey: item.billingKey,
          success: true,
          result: chargeResult,
        });
        successCount++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '정기 결제 승인 중 알 수 없는 오류가 발생했습니다.';

        results.push({
          userId: item.userId,
          billingKey: item.billingKey,
          success: false,
          error: errorMessage,
        });
        failedCount++;
      }
    }

    return {
      totalCount: dueItems.length,
      successCount,
      failedCount,
      targetDate: targetDate.toISOString(),
      results,
    };
  }
}
