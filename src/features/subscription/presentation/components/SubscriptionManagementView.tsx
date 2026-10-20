'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserSubscriptionDetails } from '../../domain/models/Subscription';
import { UserSubscriptionDashboard } from './UserSubscriptionDashboard';
import {
  cancelSubscriptionAction,
  resetSubscriptionForTestingAction,
  getBillingInfoAction,
} from '../actions/payment.server-actions';
import { BillingKeyInfo } from '../../domain/models/Billing';

export interface SubscriptionManagementViewProps {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  subscriptionDetails: UserSubscriptionDetails;
}

export const SubscriptionManagementView: React.FC<SubscriptionManagementViewProps> = ({
  user,
  subscriptionDetails,
}) => {
  const router = useRouter();
  const [billingInfo, setBillingInfo] = React.useState<BillingKeyInfo | null>(null);
  const [isCharging, setIsCharging] = React.useState(false);
  const [chargeMessage, setChargeMessage] = React.useState<{ text: string; isError: boolean } | null>(null);

  React.useEffect(() => {
    getBillingInfoAction(user?.id).then((res) => {
      if (res.success && res.billingInfo) {
        setBillingInfo(res.billingInfo);
      }
    });
  }, [user?.id]);

  const handleTestCancel = async () => {
    await cancelSubscriptionAction('테스트 구독 중지');
    router.push('/pricing');
  };

  const handleTestTrial = async () => {
    await resetSubscriptionForTestingAction();
    router.push('/pricing');
  };

  const handleExecuteRecurringCharge = async () => {
    setIsCharging(true);
    setChargeMessage(null);
    try {
      const res = await fetch('/api/billing/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setChargeMessage({
          text: `30일 주기 정기 결제 승인 완료! (주문번호: ${data.data.orderId}, 다음 결제 예정일: ${new Date(data.data.nextBillingDate).toLocaleDateString('ko-KR')})`,
          isError: false,
        });
        router.refresh();
      } else {
        setChargeMessage({
          text: `정기 결제 실패: ${data.error}`,
          isError: true,
        });
      }
    } catch (e: unknown) {
      setChargeMessage({
        text: `네트워크 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`,
        isError: true,
      });
    } finally {
      setIsCharging(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <main className="w-full pt-16 bg-surface min-h-[calc(100vh-16rem)]">
        <div className="relative w-full overflow-hidden pb-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8">

            {/* Quick State Simulator Bar for Testing */}
            <div className="mb-8 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-xl">science</span>
                <span className="text-xs font-bold text-on-surface">화면 상태 시뮬레이터 (자동 리다이렉트):</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  현재 페이지: /subscription (결제 회원 전용)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleTestCancel}
                  className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  title="구독 중지 후 /pricing으로 자동 리다이렉트"
                >
                  🔴 구독 중지 (→ /pricing 리다이렉트)
                </button>
                <button
                  type="button"
                  onClick={handleTestTrial}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  title="미결제 상태로 리셋 후 /pricing으로 자동 리다이렉트"
                >
                  🟡 미결제 체험 (→ /pricing 리다이렉트)
                </button>
              </div>
            </div>

            {/* Registered Billing Key & Recurring Payment Execution Card */}
            <div className="mb-8 p-6 rounded-2xl bg-primary-fixed/20 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center text-2xl shrink-0 shadow-xs">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                      토스페이먼츠 정기 결제(빌링) 등록 수단
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary text-on-primary">
                      30일 주기
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {billingInfo ? (
                      <>
                        등록 카드: <strong className="text-on-surface">{billingInfo.cardCompany || '신용카드'} ({billingInfo.cardNumberMasked || '****'})</strong> • 
                        다음 결제 예정일: <strong className="text-primary">{billingInfo.nextBillingDate ? new Date(billingInfo.nextBillingDate).toLocaleDateString('ko-KR') : '30일 후'}</strong>
                      </>
                    ) : (
                      <>
                        등록된 빌링키로 매 30일마다 자동 갱신됩니다. 아래 버튼으로 엔드포인트를 즉시 실행해 볼 수 있습니다.
                      </>
                    )}
                  </p>
                  {chargeMessage && (
                    <div
                      className={`mt-2 p-2.5 rounded-xl text-xs font-medium ${
                        chargeMessage.isError
                          ? 'bg-error-container/30 text-error border border-error/20'
                          : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                      }`}
                    >
                      {chargeMessage.text}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleExecuteRecurringCharge}
                disabled={isCharging}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isCharging ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    <span>정기 결제 승인 중...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">autorenew</span>
                    <span>정기 결제 엔드포인트 실행 (30일 연장)</span>
                  </>
                )}
              </button>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6 font-medium">
              <Link href="/dashboard" className="hover:text-on-surface transition-colors">
                내 워크스페이스
              </Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-on-surface font-semibold">구독 및 결제 관리</span>
            </div>

            {/* Header Section */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-label-sm text-label-sm mb-3.5 border border-emerald-500/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>CloudNote Pro 멤버십 구독 활성화됨</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3 font-bold">
                구독 및 결제 관리
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                회원님의 현재 멤버십 플랜, 실시간 리소스 이용 현황 및 결제 영수증 내역을 관리할 수 있습니다.
              </p>
            </div>

            {/* Main Subscription Dashboard */}
            <UserSubscriptionDashboard
              subscription={subscriptionDetails.subscription}
              transactions={subscriptionDetails.transactions}
              isAlreadyPaid={true}
              user={user}
              onScrollToPlans={() => {
                router.push('/pricing?change=true');
              }}
            />

            {/* Plan Upgrade / Change Banner */}
            <div className="mt-8 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">upgrade</span>
                </div>
                <div>
                  <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                    다른 플랜으로 업그레이드 또는 변경하시겠습니까?
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Team 플랜으로 전환하여 팀원들과 실시간 다중 협업 캔버스를 이용할 수 있습니다.
                  </p>
                </div>
              </div>
              <Link
                href="/pricing?change=true"
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>플랜 변경 페이지로 이동</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* FAQ */}
            <div className="mt-16 border-t border-outline-variant/20 pt-10 max-w-4xl mx-auto">
              <h3 className="font-title-md text-title-md font-bold text-on-surface text-center mb-6">
                자주 묻는 질문 (FAQ)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/15">
                  <h4 className="font-bold text-on-surface mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">help</span>
                    구독 취소 시 환불 기준이 어떻게 되나요?
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    결제일로부터 7일 이내에는 거래 내역의 [결제 취소] 버튼을 통해 100% 전액 환불받으실 수 있습니다. 구독 중지 시에는 다음 갱신일까지 서비스가 유지됩니다.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/15">
                  <h4 className="font-bold text-on-surface mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">receipt</span>
                    전자 영수증 및 매출전표 출력
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    결제 내역 목록의 [영수증 보기] 버튼을 클릭하시면 토스페이먼츠 공식 전자 결제 영수증 및 카드 매출전표를 즉시 확인 및 인쇄하실 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
