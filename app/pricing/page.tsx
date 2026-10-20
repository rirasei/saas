import { redirect } from 'next/navigation';
import { PricingView } from '@/src/features/subscription/presentation/components/PricingView';
import { createClient } from '@/src/shared/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository';
import { GetUserSubscriptionDetailsUseCase } from '@/src/features/subscription/application/use-cases/GetUserSubscriptionDetailsUseCase';
import { UserSubscriptionDetails } from '@/src/features/subscription/domain/models/Subscription';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

export const metadata = {
  title: '요금제 및 결제 - CloudNote',
  description: '팀과 개인의 성장에 맞춘 유연한 요금제 - CloudNote',
};

export const instant = false;

interface PricingPageProps {
  searchParams?: Promise<{
    change?: string;
    cancel?: string;
    fail?: string;
    message?: string;
    code?: string;
  }>;
}

export default async function PricingPage(props: PricingPageProps) {
  await connection();
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isPlanChangeRequest = searchParams.change === 'true';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile: { name?: string | null; email?: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from('user')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle();
    userProfile = data as { name?: string | null; email?: string | null } | null;
  }

  let subscriptionDetails: UserSubscriptionDetails = {
    subscription: null,
    transactions: [],
    isAlreadyPaid: false,
  };

  if (user) {
    const subRepo = new SupabaseSubscriptionRepository();
    const useCase = new GetUserSubscriptionDetailsUseCase(subRepo);
    subscriptionDetails = await useCase.execute(user.id);
  }

  const cookieStore = await cookies();
  const cookieStatus = user ? cookieStore.get('cloudnote_subscription_status')?.value : undefined;

  // 1. Supabase subscriptions 테이블이 단일 진실 공급원(SSOT)입니다.
  const dbStatus = subscriptionDetails.subscription?.status;
  const isPeriodValid = subscriptionDetails.subscription?.currentPeriodEnd
    ? new Date(subscriptionDetails.subscription.currentPeriodEnd).getTime() > Date.now()
    : false;
  const hasAccess = Boolean(
    user &&
      (dbStatus
        ? dbStatus === 'ACTIVE' ||
          ((dbStatus === 'CANCELED' || Boolean(subscriptionDetails.subscription?.cancelAtPeriodEnd)) && isPeriodValid)
        : cookieStatus === 'ACTIVE')
  );

  // 2. 브라우저 세션 쿠키가 Supabase DB 상태와 다를 경우 DB 기준으로 즉시 자동 동기화(Self-Healing)합니다.
  if (dbStatus && cookieStatus !== dbStatus) {
    try {
      cookieStore.set('cloudnote_subscription_status', dbStatus, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
      });
    } catch {
      // Server Component context
    }
  }

  // 핵심 자동 리다이렉트:
  // 이용 권한이 유효한 상태의 사용자가 일반 방문했을 경우,
  // 전용 구독 관리 페이지(/subscription)로 자동 리다이렉트합니다!
  if (hasAccess && !isPlanChangeRequest) {
    redirect('/subscription');
  }


  return (
    <PricingView
      user={{
        id: user?.id,
        name:
          userProfile?.name ||
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.email?.split('@')[0] ||
          '사용자',
        email: userProfile?.email || user?.email || 'user@cloudnote.io',
      }}
      isAlreadyPaid={hasAccess}
      isPlanChangeRequest={isPlanChangeRequest}

      subscriptionDetails={subscriptionDetails}
      initialNotice={
        searchParams.cancel === 'true'
          ? {
              type: 'CANCELED',
              message: searchParams.message || '결제가 취소되었습니다.',
              code: searchParams.code || 'USER_CANCEL',
            }
          : searchParams.fail === 'true'
          ? {
              type: 'FAILED',
              message: searchParams.message || '결제 진행 중 오류가 발생했습니다.',
              code: searchParams.code || 'PAYMENT_FAILED',
            }
          : null
      }
    />
  );
}
