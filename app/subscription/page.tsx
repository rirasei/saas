import { redirect } from 'next/navigation';
import { SubscriptionManagementView } from '@/src/features/subscription/presentation/components/SubscriptionManagementView';
import { createClient } from '@/src/shared/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/src/features/subscription/infrastructure/repositories/SupabaseSubscriptionRepository';
import { GetUserSubscriptionDetailsUseCase } from '@/src/features/subscription/application/use-cases/GetUserSubscriptionDetailsUseCase';
import { UserSubscriptionDetails } from '@/src/features/subscription/domain/models/Subscription';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

export const metadata = {
  title: '내 구독 및 결제 관리 - CloudNote',
  description: 'CloudNote 멤버십 현황 및 결제 영수증 내역 관리',
};

export const instant = false;

export default async function SubscriptionPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?mode=login&next=/subscription');
  }

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

  const subRepo = new SupabaseSubscriptionRepository();
  const useCase = new GetUserSubscriptionDetailsUseCase(subRepo);
  subscriptionDetails = await useCase.execute(user.id);

  const cookieStore = await cookies();
  const cookieStatus = cookieStore.get('cloudnote_subscription_status')?.value;

  // 1. Supabase subscriptions 테이블이 단일 진실 공급원(SSOT)입니다.
  const dbStatus = subscriptionDetails.subscription?.status;
  const isPeriodValid = subscriptionDetails.subscription?.currentPeriodEnd
    ? new Date(subscriptionDetails.subscription.currentPeriodEnd).getTime() > Date.now()
    : false;
  const hasAccess = dbStatus
    ? (dbStatus === 'ACTIVE' || ((dbStatus === 'CANCELED' || Boolean(subscriptionDetails.subscription?.cancelAtPeriodEnd)) && isPeriodValid))
    : cookieStatus === 'ACTIVE';

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

  // 활성 구독(ACTIVE) 또는 취소 후 유효 이용 기간(current_period_end) 이내인 회원이 아닌 경우에만 /pricing으로 리다이렉트합니다.
  if (!hasAccess) {
    redirect('/pricing');
  }


  return (
    <SubscriptionManagementView
      user={{
        id: user?.id,
        name:
          userProfile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '사용자',
        email: userProfile?.email || user?.email || 'user@cloudnote.io',
      }}
      subscriptionDetails={subscriptionDetails}
    />
  );
}
