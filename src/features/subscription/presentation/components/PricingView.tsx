'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import {
  createPendingPaymentAction,
  recordPaymentCancelAction,
  recordPaymentFailAction,
  cancelSubscriptionAction,
  resumeSubscriptionAction,
  resetSubscriptionForTestingAction,
} from '../actions/payment.server-actions';
import { UserSubscriptionDashboard } from './UserSubscriptionDashboard';
import { UserSubscriptionDetails } from '../../domain/models/Subscription';

export interface PricingViewProps {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  isAlreadyPaid?: boolean;
  isPlanChangeRequest?: boolean;
  subscriptionDetails?: UserSubscriptionDetails;
  initialNotice?: {
    type: 'PENDING' | 'CANCELED' | 'FAILED';
    message: string;
    code?: string;
  } | null;
}

export const PricingView: React.FC<PricingViewProps> = ({
  user,
  isAlreadyPaid = false,
  isPlanChangeRequest = false,
  subscriptionDetails,
  initialNotice = null,
}) => {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Pro' | 'Team'>('Pro');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSwitchingState, setIsSwitchingState] = useState(false);
  const [noticeState, setNoticeState] = useState<{
    type: 'PENDING' | 'CANCELED' | 'FAILED';
    message: string;
    code?: string;
  } | null>(initialNotice);
  const [orderCode, setOrderCode] = useState('89042');

  useEffect(() => {
    setOrderCode(Math.floor(100000 + Math.random() * 900000).toString());
  }, []);

  // Determine user status
  const status = subscriptionDetails?.subscription?.status || (isAlreadyPaid ? 'ACTIVE' : 'TRIALING');

  // Calculate current price based on plan and billing cycle
  const currentAmount = useMemo(() => {
    if (selectedPlan === 'Starter') return 0;
    if (selectedPlan === 'Pro') return isYearly ? 94800 : 9900;
    if (selectedPlan === 'Team') return isYearly ? 230400 : 24000;
    return 94800;
  }, [selectedPlan, isYearly]);



  // Test state simulation handlers (with automatic redirect)
  const handleTestActivate = async () => {
    setIsSwitchingState(true);
    await resumeSubscriptionAction();
    setIsSwitchingState(false);
    // Automatically redirect to the dedicated paid user page!
    router.push('/subscription');
  };

  const handleTestCancel = async () => {
    setIsSwitchingState(true);
    await cancelSubscriptionAction('테스트 상태 전환: 구독 중지');
    setIsSwitchingState(false);
    router.refresh();
  };

  const handleTestTrial = async () => {
    setIsSwitchingState(true);
    await resetSubscriptionForTestingAction();
    setIsSwitchingState(false);
    router.refresh();
  };

  // Toss Payments Billing Checkout Handler
  const handleCheckout = async () => {
    if (selectedPlan === 'Starter') {
      alert('Starter 플랜은 무료 플랜입니다. 별도의 결제 없이 모든 기본 기능을 바로 이용하실 수 있습니다.');
      return;
    }

    if (!agreedToTerms) {
      alert('정기 결제 이용약관에 동의해 주세요.');
      return;
    }

    setIsProcessing(true);
    let orderId = `order_${selectedPlan.toLowerCase()}_${Date.now()}`;

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      // 1. Create PENDING state transaction in DB before opening PG window
      const pendingRes = await createPendingPaymentAction({
        plan: selectedPlan,
        isYearly,
        amount: currentAmount,
      });

      if (!pendingRes.success || !pendingRes.orderId) {
        throw new Error(pendingRes.error || '결제 대기 주문 등록에 실패했습니다.');
      }

      orderId = pendingRes.orderId;
      const orderName = pendingRes.orderName || `CloudNote ${selectedPlan} (${isYearly ? '연간' : '월간'} 결제)`;

      setNoticeState({
        type: 'PENDING',
        message: '토스페이먼츠 자동 결제 카드 등록창이 열립니다. 안전하게 인증을 진행해 주세요.',
        code: orderId,
      });

      // 2. Open Toss Payments Billing Auth Window (빌링키 발급 창)
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const clientKey =
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ||
        'test_ck_yZqmkKeP8g7pjeb70OXj8bQRxB9l';
      const customerKey = user?.id || '9ef7444d-159a-4968-b992-7a767995deb2';

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${origin}/pricing/done?plan=${selectedPlan}&amount=${currentAmount}`,
        failUrl: `${origin}/pricing/done`,
        customerEmail: user?.email || 'user@cloudnote.io',
        customerName: user?.name || '사용자',
      });
    } catch (err: unknown) {
      console.error('Payment request error or cancel:', err);
      setIsProcessing(false);

      const errObj = err as { code?: string; message?: string };
      const isUserCancel = Boolean(
        errObj?.code === 'USER_CANCEL' ||
        errObj?.code === 'PAY_PROCESS_CANCELED' ||
        errObj?.message?.includes('취소')
      );

      if (isUserCancel) {
        setNoticeState({
          type: 'CANCELED',
          message: '결제가 취소되었습니다. 결제 시도 상태가 "취소됨(CANCELED)"으로 안전하게 기록되었습니다.',
          code: errObj?.code || 'USER_CANCEL',
        });
        await recordPaymentCancelAction(
          orderId,
          errObj?.message || '사용자에 의해 결제창이 닫히거나 취소되었습니다.'
        );
      } else {
        const errorMsg = errObj?.message || '결제 진행 중 오류가 발생했습니다.';
        setNoticeState({
          type: 'FAILED',
          message: `결제 승인 실패 [${errObj?.code || 'FAILED'}]: ${errorMsg}`,
          code: errObj?.code,
        });
        await recordPaymentFailAction(
          orderId,
          errObj?.code || 'PAYMENT_FAILED',
          errorMsg,
          currentAmount
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <main className="w-full pt-16 bg-surface min-h-[calc(100vh-16rem)]">
        <div className="relative w-full overflow-hidden pb-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8">

            {/* Quick State Simulator Bar for Testing (with explicit redirect indicator) */}
            <div className="mb-8 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-xl">science</span>
                <span className="text-xs font-bold text-on-surface">화면 상태 시뮬레이터 (자동 리다이렉트):</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : status === 'CANCELED'
                    ? 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}>
                  현재 페이지: /pricing (요금제 및 결제) • {status === 'ACTIVE' ? '플랜 변경 모드' : status === 'CANCELED' ? '구독 중지 상태' : '미결제 체험 상태'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                <button
                  type="button"
                  disabled={isSwitchingState}
                  onClick={handleTestActivate}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                  title="결제 완료 활성화 후 /subscription으로 자동 리다이렉트"
                >
                  🟢 결제 완료 (→ /subscription 자동 이동)
                </button>
                <button
                  type="button"
                  disabled={isSwitchingState || status === 'CANCELED'}
                  onClick={handleTestCancel}
                  className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                  title="구독 중지 상태로 전환"
                >
                  🔴 구독 중지 (CANCELED)
                </button>
                <button
                  type="button"
                  disabled={isSwitchingState || status === 'TRIALING'}
                  onClick={handleTestTrial}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                  title="미결제 무료 체험 상태로 전환"
                >
                  🟡 미결제 체험 (TRIALING)
                </button>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6 font-medium">
              <Link href="/dashboard" className="hover:text-on-surface transition-colors">
                내 워크스페이스
              </Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-on-surface font-semibold">요금제 및 결제</span>
            </div>

            {/* Banner 1: Plan Change Mode (when accessed by active subscriber with ?change=true) */}
            {isPlanChangeRequest && (
              <div className="max-w-4xl mx-auto mb-8 p-4 rounded-2xl bg-secondary-container/30 border border-secondary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-secondary">
                    published_with_changes
                  </span>
                  <div>
                    <h4 className="font-title-sm text-title-sm font-bold text-on-surface">
                      플랜 변경 모드 (현재 Pro 멤버십 구독 중)
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      상위 Team 플랜으로 업그레이드하거나 결제 주기를 변경하실 수 있습니다.
                    </p>
                  </div>
                </div>
                <Link
                  href="/subscription"
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <span>내 구독 관리로 돌아가기</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            )}

            {/* Banner 2: Canceled Subscription Notice */}
            {status === 'CANCELED' && (
              <div className="max-w-4xl mx-auto mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
                  <div>
                    <span className="font-label-md text-label-md font-bold text-on-surface block">
                      구독이 중지(해지)된 상태입니다
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      노트 생성 및 편집 권한이 제한되어 있습니다. 아래에서 플랜을 선택하여 즉시 구독을 재개하세요.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSwitchingState}
                  onClick={handleTestActivate}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary/95 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">replay</span>
                  <span>구독 재개하기</span>
                </button>
              </div>
            )}

            {/* Banner 3: Pending / Canceled / Failed Notice */}
            {noticeState && (
              <div
                className={`max-w-4xl mx-auto mb-8 p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all ${
                  noticeState.type === 'PENDING'
                    ? 'bg-primary-container/20 border-primary/30 text-on-surface'
                    : noticeState.type === 'CANCELED'
                    ? 'bg-amber-500/10 border-amber-500/30 text-on-surface'
                    : 'bg-error-container/20 border-error/30 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      noticeState.type === 'PENDING'
                        ? 'text-primary animate-spin'
                        : noticeState.type === 'CANCELED'
                        ? 'text-amber-500'
                        : 'text-error'
                    }`}
                  >
                    {noticeState.type === 'PENDING'
                      ? 'progress_activity'
                      : noticeState.type === 'CANCELED'
                      ? 'cancel'
                      : 'error'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          noticeState.type === 'PENDING'
                            ? 'bg-primary-container text-primary font-semibold'
                            : noticeState.type === 'CANCELED'
                            ? 'bg-amber-500/20 text-amber-700'
                            : 'bg-error-container text-error'
                        }`}
                      >
                        상태: {noticeState.type}
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {noticeState.type === 'PENDING'
                          ? '결제 대기 (결제 모듈 시작됨)'
                          : noticeState.type === 'CANCELED'
                          ? '사용자 결제 취소'
                          : '결제 시도 실패'}
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {noticeState.message}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNoticeState(null)}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                  title="닫기"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* Dedicated Pricing & Checkout Section */}
            <div className="space-y-12 animate-in fade-in duration-300">
              {/* Section Header */}
              <div id="plans-section" className="text-center max-w-3xl mx-auto mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm mb-4 shadow-xs">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <span>토스페이먼츠 안전 결제 연동 (테스트 샌드박스)</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-4 font-bold">
                  팀과 개인의 성장에 맞춘 유연한 요금제
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  생각의 흐름을 방해하지 않는 지능형 클라우드 워크스페이스. 최적의 플랜을 선택하세요.
                </p>

                {/* Billing Period Toggle */}
                <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-surface-container shadow-inner">
                  <button
                    type="button"
                    onClick={() => setIsYearly(false)}
                    className={`px-5 py-2 rounded-full font-label-md text-label-md transition-all cursor-pointer ${
                      !isYearly
                        ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    월간 결제
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsYearly(true)}
                    className={`px-5 py-2 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      isYearly
                        ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>연간 결제</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                      20% 할인
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid Layout with Plans & Checkout Drawer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Plans Column (6 Cols) */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Plan 1: Starter */}
                    <div
                      onClick={() => setSelectedPlan('Starter')}
                      className={`p-5 rounded-2xl transition-all cursor-pointer border ${
                        selectedPlan === 'Starter'
                          ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest shadow-md'
                          : 'border-outline-variant/20 bg-surface-container-lowest/80 hover:bg-surface-container-lowest shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-title text-title text-on-surface font-semibold">Starter</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs">
                          무료
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant mb-4">
                        개인 일상 기록 및 아이디어 아카이빙
                      </p>
                      <div className="mb-4">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">₩0</span>
                        <span className="font-body-sm text-xs text-on-surface-variant"> / 무료</span>
                      </div>
                      <ul className="space-y-2 text-xs text-on-surface-variant pt-3 border-t border-outline-variant/20">
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>기본 마크다운 편집</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>1GB 클라우드 저장소</span>
                        </li>
                      </ul>
                    </div>

                    {/* Plan 2: Pro */}
                    <div
                      onClick={() => setSelectedPlan('Pro')}
                      className={`p-5 rounded-2xl transition-all cursor-pointer border relative ${
                        selectedPlan === 'Pro'
                          ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest shadow-md'
                          : 'border-outline-variant/20 bg-surface-container-lowest/80 hover:bg-surface-container-lowest shadow-xs'
                      }`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-xs font-bold shadow-xs whitespace-nowrap">
                        가장 인기
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-title text-title text-on-surface font-semibold">Pro</span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-semibold">
                          추천
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant mb-4">
                        생산성 극대화를 위한 올인원 지능형 메모
                      </p>
                      <div className="mb-4">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {isYearly ? '₩94,800' : '₩9,900'}
                        </span>
                        <span className="font-body-sm text-xs text-on-surface-variant">
                          {isYearly ? ' / 1년 (연 20% 할인)' : ' / 1개월'}
                        </span>
                      </div>
                      <ul className="space-y-2 text-xs text-on-surface-variant pt-3 border-t border-outline-variant/20">
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span className="font-semibold text-on-surface">무제한 노트 및 문서 생성</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span className="font-semibold text-on-surface">월 500회 AI 자동 요약</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>무제한 기기 동기화 (0ms CRDT)</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>30일 버전 히스토리 복원</span>
                        </li>
                      </ul>
                    </div>

                    {/* Plan 3: Team */}
                    <div
                      onClick={() => setSelectedPlan('Team')}
                      className={`p-5 rounded-2xl transition-all cursor-pointer border ${
                        selectedPlan === 'Team'
                          ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest shadow-md'
                          : 'border-outline-variant/20 bg-surface-container-lowest/80 hover:bg-surface-container-lowest shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-title text-title text-on-surface font-semibold">Team</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs">
                          팀 협업
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant mb-4">
                        실시간 팀 협업과 중앙 집중 관리
                      </p>
                      <div className="mb-4">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {isYearly ? '₩230,400' : '₩24,000'}
                        </span>
                        <span className="font-body-sm text-xs text-on-surface-variant">
                          {isYearly ? ' / 1년 (연 20% 할인)' : ' / 1개월'}
                        </span>
                      </div>
                      <ul className="space-y-2 text-xs text-on-surface-variant pt-3 border-t border-outline-variant/20">
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>Pro의 모든 기능 포함</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>실시간 동시 편집 캔버스</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">check</span>
                          <span>팀 권한 및 보안 감사 로그</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Feature Guarantee Notice */}
                  <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">verified</span>
                    <p className="text-xs text-on-surface-variant">
                      결제 즉시 모든 노트 생성, 편집, AI 자동 요약 권한이 활성화되며 7일 이내 전액 환불이 보장됩니다.
                    </p>
                  </div>
                </div>

                {/* Checkout Drawer (6 Cols) */}
                <div className="lg:col-span-6 p-6 lg:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-lg flex flex-col gap-6 sticky top-24">
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">주문 번호 식별자</span>
                      <span className="font-mono text-xs text-primary font-semibold" suppressHydrationWarning>
                        #CN-{orderCode}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-xs font-bold">
                      안전 결제 대기
                    </span>
                  </div>

                  {/* Order Summary Box */}
                  <div className="p-4 rounded-2xl bg-surface-container-low space-y-2.5">
                    <div className="flex justify-between font-label-md text-label-md text-on-surface">
                      <span className="font-semibold">CloudNote {selectedPlan} ({isYearly ? '연간' : '월간'})</span>
                      <span className="font-bold">
                        {selectedPlan === 'Starter'
                          ? '₩0'
                          : `₩${(isYearly ? (selectedPlan === 'Team' ? 288000 : 118800) : currentAmount).toLocaleString()}`}
                      </span>
                    </div>
                    {isYearly && selectedPlan !== 'Starter' && (
                      <div className="flex justify-between font-label-sm text-label-sm text-secondary font-medium">
                        <span>연간 구독 프로모션 (20% 할인 적용)</span>
                        <span>-₩{selectedPlan === 'Team' ? '57,600' : '24,000'}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-outline-variant/20 flex justify-between font-headline-sm text-headline-sm font-bold text-on-surface">
                      <span>최종 결제 금액</span>
                      <span className="text-primary font-bold">₩{currentAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedPlan === 'Starter' ? (
                    <div className="p-8 text-center rounded-2xl bg-surface-container-low flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-primary">redeem</span>
                      <h3 className="font-title text-title font-bold text-on-surface">무료 Starter 플랜</h3>
                      <p className="font-body-sm text-on-surface-variant max-w-xs">
                        Starter 플랜은 결제 정보 없이 영구 무료로 즉시 사용할 수 있습니다.
                      </p>
                    </div>
                  ) : (
                    /* Toss Payments Billing Payment Method Box */
                    <div className="space-y-4">
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface font-medium mb-2.5">
                          결제 수단
                        </label>
                        <div className="p-4 rounded-2xl bg-surface-container-high border-2 border-primary/40 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-xl">credit_card</span>
                            </div>
                            <div>
                              <p className="font-label-md font-bold text-on-surface">신용/체크카드 자동결제</p>
                              <p className="text-xs text-on-surface-variant">30일 주기 정기 결제 (언제든 해지 가능)</p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                        </div>
                      </div>

                      {/* Recurring Billing Agreement Checkbox */}
                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 rounded border-outline text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span className="font-body-sm text-xs text-on-surface-variant leading-snug">
                          매 30일마다 선택한 요금제로 자동 결제되며, 결제 전 사전 안내됩니다. 서비스 이용약관 및 자동결제 조건에 동의합니다.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Checkout CTA Button */}
                  <button
                    type="button"
                    disabled={isProcessing || (selectedPlan !== 'Starter' && !agreedToTerms)}
                    onClick={handleCheckout}
                    className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span className="material-symbols-outlined text-xl animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <>
                        <span>
                          {selectedPlan === 'Starter'
                            ? '무료로 시작하기'
                            : `₩${currentAmount.toLocaleString()} 자동 결제(정기 결제) 등록하기`}
                        </span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>

                  <div className="text-center font-body-sm text-xs text-on-surface-variant flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
                    <span>7일 전액 환불 보장 • 가상 결제 테스트 모드 • SSL 256-bit</span>
                  </div>
                </div>
              </div>

              {/* Past Transactions for Unpaid / Canceled User (if any exists) */}
              {subscriptionDetails && subscriptionDetails.transactions.length > 0 && (
                <div className="pt-8">
                  <UserSubscriptionDashboard
                    subscription={subscriptionDetails.subscription}
                    transactions={subscriptionDetails.transactions}
                    isAlreadyPaid={false}
                    user={user}
                    isCompact={true}
                  />
                </div>
              )}
            </div>

            {/* Common FAQ Section */}
            <div className="mt-20 border-t border-outline-variant/20 pt-12 max-w-4xl mx-auto">
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface text-center mb-8">
                자주 묻는 질문 (FAQ)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/15">
                  <h4 className="font-bold text-on-surface mb-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">help</span>
                    구독 취소나 환불은 어떻게 진행되나요?
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    구독 결제 후 7일 이내에는 [결제 취소] 버튼을 통해 즉시 전액 환불받으실 수 있습니다. 구독 중지 시에는 현재 결제 주기 만료일까지 서비스가 유지되며 다음 주기부터 자동 결제되지 않습니다.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/15">
                  <h4 className="font-bold text-on-surface mb-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">receipt</span>
                    세금계산서 및 매출전표가 발급되나요?
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    네, 토스페이먼츠 안전 결제망을 통해 결제 완료 즉시 국세청 연동 전자 영수증 및 카드 매출전표가 자동 발급되며, [영수증 보기] 버튼으로 언제든 열람 및 출력이 가능합니다.
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
