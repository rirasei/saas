import { NextResponse } from 'next/server';
import { createClient } from '@/src/shared/lib/supabase/server';
import { BillingRepository } from '@/src/features/subscription/infrastructure/repositories/BillingRepository';
import { SupabaseSubscriptionRepository } from '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository';
import { ChargeRecurringBillingUseCase } from '@/src/features/subscription/application/use-cases/ChargeRecurringBillingUseCase';

export async function POST(request: Request) {
  try {
    let body: { userId?: string; amount?: number; orderName?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty
    }

    let targetUserId = body.userId;

    // 세션에서 사용자 확인
    if (!targetUserId) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        targetUserId = user?.id;
      } catch {
        // ignore
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: '결제 대상 사용자 ID(userId)가 필요하거나 로그인이 필요합니다.',
        },
        { status: 400 }
      );
    }

    const billingRepo = new BillingRepository();
    const subRepo = new SupabaseSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(billingRepo, subRepo);

    const result = await chargeUseCase.execute({
      userId: targetUserId,
      amount: body.amount,
      orderName: body.orderName,
    });

    return NextResponse.json({
      success: true,
      message: '30일 주기 정기 결제가 성공적으로 실행되었습니다.',
      data: result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : '정기 결제 실행 중 오류가 발생했습니다.';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
