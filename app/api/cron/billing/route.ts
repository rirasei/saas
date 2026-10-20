import { NextResponse } from 'next/server';
import { BillingRepository } from '@/src/features/subscription/infrastructure/repositories/BillingRepository';
import { SupabaseSubscriptionRepository } from '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository';
import { ChargeRecurringBillingUseCase } from '@/src/features/subscription/application/use-cases/ChargeRecurringBillingUseCase';
import { ProcessTodayDueBillingsUseCase } from '@/src/features/subscription/application/use-cases/ProcessTodayDueBillingsUseCase';

export const maxDuration = 60;

/**
 * Vercel Cron Job 인증 검증
 * Vercel Cron은 설정된 Authorization: Bearer <CRON_SECRET> 헤더를 전송합니다.
 * 환경 변수 CRON_SECRET이 설정되어 있는 경우 이를 검증하며, 미설정 시(로컬 개발/테스트)에는 통과합니다.
 */
export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return true; // 로컬 개발 및 테스트 환경 허용
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Vercel Cron Job 기본 호출 엔드포인트 (GET)
 * Vercel Cron은 지정된 스케줄에 맞춰 GET 요청을 전송합니다.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid CRON_SECRET token' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetDateParam = searchParams.get('targetDate');
    const targetDate = targetDateParam ? new Date(targetDateParam) : new Date();

    const billingRepo = new BillingRepository();
    const subRepo = new SupabaseSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(billingRepo, subRepo);
    const processUseCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);

    const result = await processUseCase.execute(targetDate);

    return NextResponse.json({
      success: true,
      message: '오늘 결제 대상 빌링키 정기 결제 일괄 처리가 완료되었습니다.',
      data: result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : '정기 결제 일괄 처리 중 알 수 없는 오류가 발생했습니다.';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * 수동 트리거 및 외부 시스템 연동용 엔드포인트 (POST)
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid CRON_SECRET token' },
      { status: 401 }
    );
  }

  try {
    let body: { targetDate?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    const { searchParams } = new URL(request.url);
    const targetDateParam = body.targetDate || searchParams.get('targetDate');
    const targetDate = targetDateParam ? new Date(targetDateParam) : new Date();

    const billingRepo = new BillingRepository();
    const subRepo = new SupabaseSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(billingRepo, subRepo);
    const processUseCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);

    const result = await processUseCase.execute(targetDate);

    return NextResponse.json({
      success: true,
      message: '오늘 결제 대상 빌링키 정기 결제 일괄 처리가 완료되었습니다.',
      data: result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : '정기 결제 일괄 처리 중 알 수 없는 오류가 발생했습니다.';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
