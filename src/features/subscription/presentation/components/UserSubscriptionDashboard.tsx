'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Subscription,
  PaymentTransactionRecord,
} from '../../domain/models/Subscription';
import {
  cancelSubscriptionAction,
  refundPaymentAction,
  resumeSubscriptionAction,
} from '../actions/payment.server-actions';

export interface UserSubscriptionDashboardProps {
  subscription: Subscription | null;
  transactions: PaymentTransactionRecord[];
  isAlreadyPaid: boolean;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  onScrollToPlans?: () => void;
  isCompact?: boolean;
}

export const UserSubscriptionDashboard: React.FC<UserSubscriptionDashboardProps> = ({
  subscription,
  transactions,
  isAlreadyPaid,
  user,
  onScrollToPlans,
  isCompact = false,
}) => {
  const router = useRouter();
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundOrderIdTarget, setRefundOrderIdTarget] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(text);
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const planName = subscription?.plan || (isAlreadyPaid ? 'PRO' : 'STARTER');
  const planDisplay =
    planName === 'PRO' ? 'CloudNote Pro' : planName === 'TEAM' ? 'CloudNote Team' : 'Starter (무료)';
  const status = subscription?.status || (isAlreadyPaid ? 'ACTIVE' : 'TRIALING');
  const isYearly = subscription?.billingCycle === 'YEARLY' || true;

  // AI credit calculations
  const creditLimit = subscription?.aiCreditLimit || 500;
  const creditUsed = subscription?.aiCreditUsed || 0;
  const creditPercent = Math.min(100, Math.round((creditUsed / creditLimit) * 100));

  const isPeriodValid = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).getTime() > Date.now()
    : false;
  const nextBillingFormatted = formatDate(subscription?.currentPeriodEnd);

  // Handlers for cancel, resume, refund
  const handleCancelSubscription = async () => {
    setActionLoading('cancel');
    try {
      const res = await cancelSubscriptionAction('사용자 대시보드에서 직접 구독 취소');
      if (res.success) {
        setActionMessage({
          type: 'success',
          text:
            res.message ||
            `구독이 성공적으로 취소되었습니다. 등록된 결제 수단(빌링키)이 삭제되었으며, ${nextBillingFormatted}까지 모든 서비스 이용 권한이 정상 유지됩니다.`,
        });
        setShowCancelModal(false);
        router.refresh();
      } else {
        setActionMessage({ type: 'error', text: res.message || '구독 취소에 실패했습니다.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: '구독 취소 처리 중 통신 오류가 발생했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async () => {
    setActionLoading('resume');
    try {
      const res = await resumeSubscriptionAction();
      if (res.success) {
        setActionMessage({ type: 'success', text: '구독이 다시 정상 활성화되었습니다!' });
        setTimeout(() => {
          router.push('/subscription');
        }, 800);
      } else {
        setActionMessage({ type: 'error', text: res.message || '구독 재개에 실패했습니다.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: '구독 재개 처리 중 오류가 발생했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundPayment = async (orderNumber: string) => {
    setActionLoading(`refund_${orderNumber}`);
    try {
      const res = await refundPaymentAction(orderNumber, '사용자 요청 전액 환불');
      if (res.success) {
        setActionMessage({ type: 'success', text: `주문 #${orderNumber} 건이 성공적으로 취소 및 환불 처리되었습니다. 요금제 페이지로 이동합니다...` });
        setRefundOrderIdTarget(null);
        setTimeout(() => {
          router.push('/pricing');
        }, 800);
      } else {
        setActionMessage({ type: 'error', text: res.message || '결제 취소 처리에 실패했습니다.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: '결제 취소 처리 중 오류가 발생했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Alert Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
              : 'bg-red-500/10 border-red-500/20 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-xl">
              {actionMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-body-sm text-body-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Subscription Canceled Banner */}
      {status === 'CANCELED' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5 sm:mt-0">
              {isPeriodValid ? 'event_available' : 'warning'}
            </span>
            <div>
              <span className="font-label-md text-label-md font-bold text-on-surface block">
                {isPeriodValid
                  ? `구독이 취소되었습니다 (${nextBillingFormatted}까지 정상 이용 가능)`
                  : '현재 구독이 만료(해지)된 상태입니다'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {isPeriodValid
                  ? `등록된 자동 결제 수단(빌링키)은 삭제되었으며, 이미 결제하신 ${nextBillingFormatted}까지는 모든 노트 작성/편집 및 프리미엄 서비스 권한이 정상 유지됩니다.`
                  : '노트 생성 및 편집이 제한될 수 있습니다. 구독을 재개하여 모든 기능을 다시 이용하세요.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={actionLoading === 'resume'}
              onClick={handleResumeSubscription}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary/95 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              {actionLoading === 'resume' ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>재개 처리 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">replay</span>
                  <span>구독 다시 시작 (재개)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 1. Main Subscription Overview Card */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm overflow-hidden">
        {/* Card Header Strip */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent px-6 py-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface">
                  {planDisplay}
                </h2>
                {status === 'ACTIVE' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-label-sm text-label-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    이용 중 (정상 활성)
                  </span>
                )}
                {status === 'TRIALING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-label-sm text-label-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    14일 무료 체험 중
                  </span>
                )}
                {status === 'CANCELED' && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${
                    isPeriodValid
                      ? 'bg-amber-500/10 text-amber-700 border border-amber-500/25'
                      : 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isPeriodValid ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    {isPeriodValid ? `구독 취소됨 (${nextBillingFormatted}까지 이용 가능)` : '구독 만료됨'}
                  </span>
                )}
                {status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-label-sm text-label-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    결제 승인 대기 중
                  </span>
                )}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {user?.email || 'user@cloudnote.io'} 워크스페이스에 연결된 멤버십입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Action */}
            <Link
              href="/notes"
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary/95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>노트 관리로 이동</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            {/* Resume button if canceled */}
            {status === 'CANCELED' && (
              <button
                type="button"
                disabled={actionLoading === 'resume'}
                onClick={handleResumeSubscription}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-label-sm text-label-sm font-semibold hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                <span>구독 재개</span>
              </button>
            )}

            {/* Cancel subscription button if active */}
            {status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-3.5 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-label-sm text-label-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="구독 취소 및 정기 결제 해지"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                <span>구독 취소</span>
              </button>
            )}

            {/* Plan change toggle */}
            {onScrollToPlans && (
              <button
                type="button"
                onClick={onScrollToPlans}
                className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium transition-all cursor-pointer"
              >
                플랜 변경 / 업그레이드
              </button>
            )}
          </div>
        </div>

        {/* Cancel Confirmation Modal Dialog */}
        {showCancelModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div
              className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Close Icon */}
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                aria-label="닫기"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              {/* Icon & Title */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center text-2xl shrink-0">
                  <span className="material-symbols-outlined">event_busy</span>
                </div>
                <div>
                  <h3 id="cancel-dialog-title" className="font-title-lg text-title-lg font-bold text-on-surface">
                    정말 구독을 취소하시겠습니까?
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    CloudNote {planDisplay} 정기 결제 해지 확인
                  </p>
                </div>
              </div>

              {/* Explanations */}
              <div className="space-y-3 my-5">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">
                    verified
                  </span>
                  <div className="text-xs leading-relaxed text-on-surface">
                    <strong className="text-primary font-semibold block mb-0.5">
                      다음 결제일({nextBillingFormatted})까지 사용 권한 유지
                    </strong>
                    구독을 취소하시더라도 이미 결제하신 <strong>{nextBillingFormatted}까지는 모든 노트 작성, 수정, 조회 및 AI 기능이 중단 없이 정상 유지</strong>됩니다.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-xl shrink-0 mt-0.5">
                    credit_card_off
                  </span>
                  <div className="text-xs leading-relaxed text-on-surface">
                    <strong className="text-red-600 font-semibold block mb-0.5">
                      자동 결제 수단(빌링키) 즉시 안전 삭제
                    </strong>
                    등록된 <strong>토스페이먼츠 정기 결제 빌링키는 즉시 안전하게 삭제</strong>되며, 다음 결제일부터 추가 요금이 청구되지 않습니다.
                  </div>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant/80 mb-6 leading-relaxed">
                * 구독 만료 전 언제든지 대시보드에서 클릭 한 번으로 구독을 다시 재개하실 수 있습니다.
              </p>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-all cursor-pointer"
                >
                  구독 유지하기
                </button>
                <button
                  type="button"
                  disabled={actionLoading === 'cancel'}
                  onClick={handleCancelSubscription}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-label-md text-label-md font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">
                        progress_activity
                      </span>
                      <span>빌링키 삭제 및 취소 중...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>구독 취소 확인</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Card Body Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Subscription Period & Billing Cycle */}
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm mb-1.5">
                <span className="material-symbols-outlined text-base">calendar_month</span>
                <span>구독 주기 및 유효 기간</span>
              </div>
              <div className="font-title-md text-title-md font-bold text-on-surface">
                {isYearly ? '연간 결제 (20% 할인)' : '월간 결제'}
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-2 space-y-1">
                <div>
                  <span className="text-on-surface-variant/70">구독 시작: </span>
                  <span className="font-medium text-on-surface">
                    {formatDate(subscription?.currentPeriodStart || '2026-10-16')}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant/70">다음 갱신일: </span>
                  <span className="font-medium text-on-surface">
                    {formatDate(subscription?.currentPeriodEnd || '2027-10-11')}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-outline-variant/15 text-xs text-on-surface-variant">
              {status === 'ACTIVE'
                ? '자동 갱신이 활성화되어 있으며 만료일에 정상 청구됩니다.'
                : status === 'CANCELED'
                ? '구독이 중지되어 다음 주기에 자동 갱신되지 않습니다.'
                : '체험 기간 종료 시 권한이 제한될 수 있습니다.'}
            </div>
          </div>

          {/* Col 2: AI Credit Progress */}
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">smart_toy</span>
                  <span>AI 스마트 크레딧</span>
                </div>
                <span className="font-semibold text-primary">
                  {creditLimit - creditUsed}회 남음
                </span>
              </div>
              <div className="font-title-md text-title-md font-bold text-on-surface">
                {creditUsed} / {creditLimit}회 사용
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(creditPercent, 4)}%` }}
                />
              </div>

              <div className="font-body-xs text-xs text-on-surface-variant mt-2">
                긴 문서 3줄 요약, 액션 아이템 추출, 자동 태깅이 무제한 포함됩니다.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-outline-variant/15 text-xs text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
              <span>매월 결제일에 크레딧이 500회로 자동 리필됩니다.</span>
            </div>
          </div>

          {/* Col 3: Cloud & Security Features */}
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm mb-1.5">
                <span className="material-symbols-outlined text-base text-secondary">cloud_done</span>
                <span>보유 혜택 및 라이선스</span>
              </div>
              <div className="font-title-md text-title-md font-bold text-on-surface">
                무제한 워크스페이스
              </div>

              <ul className="mt-2.5 space-y-1.5 text-xs text-on-surface-variant">
                <li className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">check</span>
                  <span>노트 생성, 수정, 삭제, 내보내기 전체 권한</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">check</span>
                  <span>0ms CRDT 실시간 충돌 없는 다중 동기화</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">check</span>
                  <span>AES-256 종단간 제로 지식 암호화 보장</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-outline-variant/15 text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary">security</span>
              <span>토스페이먼츠(Toss Payments) 안전 에스크로 인증</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Payment Transaction History Table */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-xl text-primary">receipt_long</span>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              결제 내역 및 전자 영수증
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
              총 {transactions.length}건
            </span>
          </div>
          <span className="text-xs text-on-surface-variant">
            * 7일 이내 결제 건은 100% 전액 환불 및 결제 취소가 가능합니다.
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/30">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">
              receipt
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant font-medium">
              아직 결제 내역이 없습니다.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant/70 mt-1 mb-4">
              아래에서 플랜을 선택하고 결제를 진행하시면 영수증 및 결제 내역이 이곳에 안전하게 보관됩니다.
            </p>
            {onScrollToPlans && (
              <button
                type="button"
                onClick={onScrollToPlans}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-xs hover:bg-primary/95 transition-all cursor-pointer"
              >
                요금제 선택하러 가기
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 text-xs font-semibold text-on-surface-variant/80 bg-surface-container-low/40">
                  <th className="py-3 px-4 rounded-l-lg">주문 번호</th>
                  <th className="py-3 px-4">결제 일시</th>
                  <th className="py-3 px-4">결제 금액</th>
                  <th className="py-3 px-4">결제 수단</th>
                  <th className="py-3 px-4">상태</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">관리 / 영수증</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id || tx.orderNumber} className="hover:bg-surface-container-low/50 transition-colors">
                    {/* Order Number */}
                    <td className="py-3.5 px-4 font-mono text-xs text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[160px] sm:max-w-xs">{tx.orderNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(tx.orderNumber)}
                          className="p-1 rounded hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                          title="주문번호 복사"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {copiedOrderId === tx.orderNumber ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </td>

                    {/* Paid At */}
                    <td className="py-3.5 px-4 text-xs text-on-surface-variant whitespace-nowrap">
                      {formatDateTime(tx.paidAt || tx.createdAt)}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-on-surface">
                        ₩{tx.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-on-surface-variant/70">
                        (공급가 ₩{tx.amount.toLocaleString()} + VAT ₩{tx.vat.toLocaleString()})
                      </div>
                    </td>

                    {/* Method */}
                    <td className="py-3.5 px-4 text-xs text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">credit_card</span>
                        <span>{tx.cardProvider || '신용/체크카드'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {tx.status === 'SUCCESS' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-label-sm text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          결제 완료
                        </span>
                      )}
                      {tx.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-label-sm text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          결제 실패
                        </span>
                      )}
                      {tx.status === 'REFUNDED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-label-sm text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          결제 취소 (환불 완료)
                        </span>
                      )}
                      {tx.status === 'CANCELED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 font-label-sm text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          취소됨
                        </span>
                      )}
                      {tx.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-label-sm text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          승인 대기
                        </span>
                      )}
                    </td>

                    {/* Actions: Receipt + Refund */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {tx.status === 'SUCCESS' && (
                          <>
                            {refundOrderIdTarget === tx.orderNumber ? (
                              <div className="inline-flex items-center gap-1.5 p-1 bg-red-50 rounded-lg border border-red-200">
                                <span className="text-xs text-red-700 font-medium px-1">환불 진행할까요?</span>
                                <button
                                  type="button"
                                  disabled={actionLoading === `refund_${tx.orderNumber}`}
                                  onClick={() => handleRefundPayment(tx.orderNumber)}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
                                >
                                  {actionLoading === `refund_${tx.orderNumber}` ? '처리중' : '확인'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRefundOrderIdTarget(null)}
                                  className="px-1.5 py-1 rounded bg-gray-200 text-gray-700 text-xs hover:bg-gray-300 transition-colors cursor-pointer"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRefundOrderIdTarget(tx.orderNumber)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
                                title="결제 취소 및 전액 환불"
                              >
                                <span className="material-symbols-outlined text-xs">restart_alt</span>
                                <span>결제 취소</span>
                              </button>
                            )}
                          </>
                        )}

                        {tx.receiptUrl ? (
                          <a
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold transition-colors cursor-pointer border border-outline-variant/20 shadow-2xs"
                          >
                            <span>영수증 보기</span>
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </a>
                        ) : (
                          <span className="text-xs text-on-surface-variant/40">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
