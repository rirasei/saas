'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/src/shared/lib/supabase/server';
import { createAdminClient } from '@/src/shared/lib/supabase/admin';
import { TossPaymentRepository } from '../../infrastructure/repositories/TossPaymentRepository';
import { ConfirmPaymentUseCase } from '../../application/use-cases/ConfirmPaymentUseCase';
import { SupabaseSubscriptionRepository } from '../../infrastructure/repositories/SupabaseSubscriptionRepository';
import { ActivateSubscriptionUseCase } from '../../application/use-cases/ActivateSubscriptionUseCase';
import { CheckNotePermissionUseCase } from '../../application/use-cases/CheckNotePermissionUseCase';
import { RecordPaymentStateUseCase } from '../../application/use-cases/RecordPaymentStateUseCase';
import { CreatePendingPaymentUseCase } from '../../application/use-cases/CreatePendingPaymentUseCase';
import { CancelSubscriptionUseCase } from '../../application/use-cases/CancelSubscriptionUseCase';
import { RefundPaymentUseCase } from '../../application/use-cases/RefundPaymentUseCase';
import { BillingRepository } from '../../infrastructure/repositories/BillingRepository';
import { PaymentReceipt } from '../../domain/models/Payment';


export interface ConfirmPaymentActionResult {
  success: boolean;
  receipt?: PaymentReceipt;
  error?: string;
}

export async function createPendingPaymentAction(params: {
  plan: 'Starter' | 'Pro' | 'Team';
  isYearly: boolean;
  amount: number;
}): Promise<{
  success: boolean;
  orderId?: string;
  orderName?: string;
  amount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

    const subRepo = new SupabaseSubscriptionRepository(supabase);
    const pendingUseCase = new CreatePendingPaymentUseCase(subRepo);

    const planCode = params.plan.toLowerCase();
    const periodCode = params.isYearly ? 'yearly' : 'monthly';
    const orderId = `order_${planCode}_${periodCode}_${Date.now()}`;
    const orderName = `CloudNote ${params.plan} (${params.isYearly ? '연간' : '월간'} 결제)`;

    await pendingUseCase.execute({
      userId,
      orderId,
      amount: params.amount,
      plan: params.plan === 'Team' ? 'TEAM' : params.plan === 'Starter' ? 'STARTER' : 'PRO',
      billingCycle: params.isYearly ? 'YEARLY' : 'MONTHLY',
    });

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_payment_state', 'PENDING', {
      path: '/',
      maxAge: 3600,
      sameSite: 'lax',
    });

    return {
      success: true,
      orderId,
      orderName,
      amount: params.amount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 대기 상태 생성 중 오류가 발생했습니다.';
    return {
      success: false,
      error: message,
    };
  }
}

export async function confirmPaymentAction(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<ConfirmPaymentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';
  const subRepo = new SupabaseSubscriptionRepository(supabase);
  const recordStateUseCase = new RecordPaymentStateUseCase(subRepo);

  try {
    // 1. Confirm payment with Toss Payments API
    const tossRepo = new TossPaymentRepository();
    const confirmUseCase = new ConfirmPaymentUseCase(tossRepo);

    const receipt = await confirmUseCase.execute({
      paymentKey,
      orderId,
      amount,
    });

    // 2. Record SUCCESS state and activate subscription (status -> 'ACTIVE' + log payment_transactions)
    await recordStateUseCase.execute({
      userId,
      orderId: receipt.orderId,
      amount: receipt.totalAmount,
      state: 'SUCCESS',
      receiptUrl: receipt.receiptUrl,
    });

    // 3. Set persistent session cookie for immediate zero-latency permission
    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'ACTIVE', {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    // 4. Revalidate cache
    revalidatePath('/notes');
    revalidatePath('/notes/new');
    revalidatePath('/dashboard');
    revalidatePath('/pricing');

    return {
      success: true,
      receipt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '결제 승인 처리 중 오류가 발생했습니다.';

    // Record FAILED state in database
    await recordStateUseCase.execute({
      userId,
      orderId,
      amount,
      state: 'FAILED',
      code: 'CONFIRM_FAILED',
      message,
    }).catch(() => {});

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'FAILED', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    });

    return {
      success: false,
      error: message,
    };
  }
}

export async function recordPaymentCancelAction(
  orderId: string,
  reason?: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

    const subRepo = new SupabaseSubscriptionRepository(supabase);
    const recordStateUseCase = new RecordPaymentStateUseCase(subRepo);

    await recordStateUseCase.execute({
      userId,
      orderId: orderId || `cancel_${Date.now()}`,
      amount: 0,
      state: 'CANCELED',
      code: 'PAY_PROCESS_CANCELED',
      message: reason || '사용자에 의해 결제가 취소되었습니다.',
    });

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'CANCELED', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    });

    revalidatePath('/pricing');
    revalidatePath('/notes');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err) {
    console.error('Failed to record payment cancellation:', err);
    return { success: false };
  }
}

export async function recordPaymentFailAction(
  orderId: string,
  code: string,
  message: string,
  amount: number = 0
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

    const subRepo = new SupabaseSubscriptionRepository(supabase);
    const recordStateUseCase = new RecordPaymentStateUseCase(subRepo);

    await recordStateUseCase.execute({
      userId,
      orderId: orderId || `fail_${Date.now()}`,
      amount,
      state: 'FAILED',
      code: code || 'PAYMENT_FAILED',
      message: message || '결제 처리에 실패했습니다.',
    });

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'FAILED', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    });

    revalidatePath('/pricing');
    revalidatePath('/notes');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err) {
    console.error('Failed to record payment failure:', err);
    return { success: false };
  }
}

export async function checkNotePermissionAction(): Promise<{
  hasPermission: boolean;
  reason?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';
  const subRepo = new SupabaseSubscriptionRepository();
  const checkUseCase = new CheckNotePermissionUseCase(subRepo);
  const permission = await checkUseCase.execute(userId);

  return {
    hasPermission: permission.canCreate,
    reason: permission.reason,
  };
}

export async function resetSubscriptionForTestingAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('cloudnote_subscription_status');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

  const adminClient = createAdminClient();
  await (adminClient.from('subscriptions') as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<unknown>;
    };
  })
    .update({ status: 'TRIALING', updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  await (adminClient.from('payment_transactions') as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<unknown>;
    };
  })
    .update({ status: 'REFUNDED' })
    .eq('user_id', userId);

  revalidatePath('/notes');
  revalidatePath('/dashboard');
  revalidatePath('/pricing');
  revalidatePath('/subscription');
}

export async function cancelSubscriptionAction(reason?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

    const subRepo = new SupabaseSubscriptionRepository();
    const billingRepo = new BillingRepository();
    const cancelUseCase = new CancelSubscriptionUseCase(subRepo, billingRepo);
    await cancelUseCase.execute(userId, reason);

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'CANCELED', {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
    });

    revalidatePath('/pricing');
    revalidatePath('/subscription');
    revalidatePath('/notes');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: '구독이 성공적으로 취소되었습니다. 등록된 결제 수단(빌링키)이 안전하게 삭제되었으며 다음 결제일까지 서비스가 정상 유지됩니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '구독 취소 처리 중 오류가 발생했습니다.';
    return { success: false, message };
  }
}


export async function refundPaymentAction(
  orderNumber: string,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

    const subRepo = new SupabaseSubscriptionRepository();
    const refundUseCase = new RefundPaymentUseCase(subRepo);
    await refundUseCase.execute(userId, orderNumber, reason);

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'CANCELED', {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
    });

    revalidatePath('/pricing');
    revalidatePath('/subscription');
    revalidatePath('/notes');
    revalidatePath('/dashboard');

    return { success: true, message: '결제가 성공적으로 취소 및 환불 처리되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 취소 처리 중 오류가 발생했습니다.';
    return { success: false, message };
  }
}

export async function resumeSubscriptionAction(): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

    const subRepo = new SupabaseSubscriptionRepository();
    await subRepo.resumeSubscription(userId);

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'ACTIVE', {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
    });

    revalidatePath('/pricing');
    revalidatePath('/subscription');
    revalidatePath('/notes');
    revalidatePath('/dashboard');

    return { success: true, message: '구독이 다시 정상 활성화되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '구독 재개 처리 중 오류가 발생했습니다.';
    return { success: false, message };
  }
}

const inFlightBillingActions = new Map<
  string,
  Promise<{
    success: boolean;
    result?: import('../../domain/models/Billing').BillingChargeResult;
    error?: string;
  }>
>();

export async function issueAndActivateBillingAction(params: {
  authKey: string;
  customerKey: string;
  plan?: 'PRO' | 'TEAM';
  amount?: number;
}): Promise<{
  success: boolean;
  result?: import('../../domain/models/Billing').BillingChargeResult;
  error?: string;
}> {
  if (params.authKey && inFlightBillingActions.has(params.authKey)) {
    return await inFlightBillingActions.get(params.authKey)!;
  }

  const executionPromise = (async () => {
    let userId = params.customerKey;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }

      const { BillingRepository } = await import(
        '../../infrastructure/repositories/BillingRepository'
      );
      const { IssueAndActivateBillingUseCase } = await import(
        '../../application/use-cases/IssueAndActivateBillingUseCase'
      );

      const billingRepo = new BillingRepository();
      const subRepo = new SupabaseSubscriptionRepository();
      const useCase = new IssueAndActivateBillingUseCase(billingRepo, subRepo);

      const plan = params.plan || 'PRO';
      const amount = params.amount || (plan === 'TEAM' ? 230400 : 94800);

      const result = await useCase.execute({
        userId,
        authKey: params.authKey,
        customerKey: params.customerKey,
        plan,
        amount,
        customerEmail: user?.email,
        customerName: user?.user_metadata?.name || user?.user_metadata?.full_name,
      });

      const cookieStore = await cookies();
      cookieStore.set('cloudnote_subscription_status', 'ACTIVE', {
        path: '/',
        maxAge: 86400 * 30,
        sameSite: 'lax',
      });

      revalidatePath('/pricing');
      revalidatePath('/subscription');
      revalidatePath('/notes');
      revalidatePath('/dashboard');

      return { success: true, result };
    } catch (err) {
      // Idempotency: If authKey was already consumed by a concurrent request, StrictMode, or reload,
      // verify if the user's workspace already has a billingKey or active subscription.
      try {
        const { BillingRepository } = await import(
          '../../infrastructure/repositories/BillingRepository'
        );
        const billingRepo = new BillingRepository();
        const billingInfo = await billingRepo.getBillingInfo(userId);

        const { GetUserSubscriptionDetailsUseCase } = await import(
          '../../application/use-cases/GetUserSubscriptionDetailsUseCase'
        );
        const subRepo = new SupabaseSubscriptionRepository();
        const recentDetails = await new GetUserSubscriptionDetailsUseCase(subRepo).execute(userId);

        if (
          billingInfo?.billingKey ||
          recentDetails.subscription?.status === 'ACTIVE'
        ) {
          const latestTx =
            recentDetails.transactions.find((t) => t.status === 'SUCCESS') ||
            recentDetails.transactions[0];

          const cookieStore = await cookies();
          cookieStore.set('cloudnote_subscription_status', 'ACTIVE', {
            path: '/',
            maxAge: 86400 * 30,
            sameSite: 'lax',
          });

          return {
            success: true,
            result: {
              success: true,
              orderId: latestTx?.orderNumber || `order_billing_${Date.now()}`,
              orderName: `CloudNote ${params.plan || 'PRO'} 정기 구독 (30일 주기)`,
              amount: latestTx?.totalAmount || params.amount || 94800,
              paidAt: latestTx?.paidAt || new Date().toISOString(),
              receiptUrl: latestTx?.receiptUrl || undefined,
              billingKey: billingInfo?.billingKey || 'registered',
              nextBillingDate:
                billingInfo?.nextBillingDate ||
                recentDetails.subscription?.currentPeriodEnd ||
                new Date(Date.now() + 30 * 86400000).toISOString(),
              card: {
                company: billingInfo?.cardCompany || latestTx?.cardProvider || '신용카드',
                number: billingInfo?.cardNumberMasked || '••••••••',
                cardType: billingInfo?.cardType,
              },
            },
          };
        }
      } catch {
        // Ignore fallback errors and continue to return standard error message
      }

      const message =
        err instanceof Error ? err.message : '빌링키 발급 및 결제 승인 중 오류가 발생했습니다.';
      return { success: false, error: message };
    }
  })();

  if (params.authKey) {
    inFlightBillingActions.set(params.authKey, executionPromise);
    // Keep in map for 15 seconds to deduplicate rapid consecutive triggers
    setTimeout(() => {
      inFlightBillingActions.delete(params.authKey);
    }, 15000);
  }

  return await executionPromise;
}

export async function chargeRecurringBillingAction(params?: {
  userId?: string;
  amount?: number;
  orderName?: string;
}): Promise<{
  success: boolean;
  result?: import('../../domain/models/Billing').BillingChargeResult;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = params?.userId || user?.id;

    if (!userId) {
      return { success: false, error: '인증된 사용자 ID가 필요합니다.' };
    }

    const { BillingRepository } = await import(
      '../../infrastructure/repositories/BillingRepository'
    );
    const { ChargeRecurringBillingUseCase } = await import(
      '../../application/use-cases/ChargeRecurringBillingUseCase'
    );

    const billingRepo = new BillingRepository();
    const subRepo = new SupabaseSubscriptionRepository();
    const useCase = new ChargeRecurringBillingUseCase(billingRepo, subRepo);

    const result = await useCase.execute({
      userId,
      amount: params?.amount,
      orderName: params?.orderName,
    });

    const cookieStore = await cookies();
    cookieStore.set('cloudnote_subscription_status', 'ACTIVE', {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
    });

    revalidatePath('/pricing');
    revalidatePath('/subscription');
    revalidatePath('/notes');
    revalidatePath('/dashboard');

    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : '정기 결제 승인 중 오류가 발생했습니다.';
    return { success: false, error: message };
  }
}

export async function getBillingInfoAction(userId?: string): Promise<{
  success: boolean;
  billingInfo?: import('../../domain/models/Billing').BillingKeyInfo | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      return { success: false, billingInfo: null };
    }

    const { BillingRepository } = await import(
      '../../infrastructure/repositories/BillingRepository'
    );
    const billingRepo = new BillingRepository();
    const billingInfo = await billingRepo.getBillingInfo(targetUserId);

    return { success: true, billingInfo };
  } catch {
    return { success: false, billingInfo: null };
  }
}

/**
 * 시간과 관계없이 오늘(또는 지정된 기준일) 결제해야 하는 모든 빌링키를 조회하고,
 * 각 빌링키에 대해 이미 구현된 정기 결제 로직을 실행하여 일괄 결제를 처리합니다.
 * (추후 Vercel Cron job 라우트에서 바로 호출할 수 있습니다)
 *
 * @param targetDateStr 특정 기준일 (옵션, 기본값: 오늘)
 */
export async function processTodayDueBillingsAction(targetDateStr?: string): Promise<{
  success: boolean;
  result?: import('../../domain/models/Billing').BatchBillingChargeResult;
  error?: string;
}> {
  try {
    const { BillingRepository } = await import(
      '../../infrastructure/repositories/BillingRepository'
    );
    const { ChargeRecurringBillingUseCase } = await import(
      '../../application/use-cases/ChargeRecurringBillingUseCase'
    );
    const { ProcessTodayDueBillingsUseCase } = await import(
      '../../application/use-cases/ProcessTodayDueBillingsUseCase'
    );

    const billingRepo = new BillingRepository();
    const subRepo = new SupabaseSubscriptionRepository();
    const chargeUseCase = new ChargeRecurringBillingUseCase(billingRepo, subRepo);
    const processUseCase = new ProcessTodayDueBillingsUseCase(billingRepo, chargeUseCase);

    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const result = await processUseCase.execute(targetDate);

    revalidatePath('/subscription');
    revalidatePath('/dashboard');

    return { success: true, result };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : '오늘 결제 대상 빌링키 일괄 결제 처리 중 오류가 발생했습니다.';
    return { success: false, error: message };
  }
}



