'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PaymentReceipt } from '../../domain/models/Payment';
import { confirmPaymentAction, recordPaymentCancelAction, recordPaymentFailAction } from '../actions/payment.server-actions';

const globalBillingPromises = new Map<string, Promise<any>>();

export const PaymentDoneView: React.FC = () => {
  const searchParams = useSearchParams();
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amountStr = searchParams.get('amount');
  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  const isUserCancel = Boolean(
    errorCode === 'PAY_PROCESS_CANCELED' ||
    errorCode === 'USER_CANCEL' ||
    errorMessage?.includes('취소')
  );

  const [paymentState, setPaymentState] = useState<'LOADING' | 'SUCCESS' | 'CANCELED' | 'FAILED'>(
    isUserCancel ? 'CANCELED' : errorCode || errorMessage ? 'FAILED' : 'LOADING'
  );
  const [errorDetails, setErrorDetails] = useState<string | null>(
    errorCode || errorMessage ? `[${errorCode || 'FAILED'}] ${errorMessage || '결제 진행 중 오류가 발생했습니다.'}` : null
  );
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  const authKey = searchParams.get('authKey');
  const customerKey = searchParams.get('customerKey');
  const planParam = (searchParams.get('plan') || 'Pro') as 'Pro' | 'Team';
  const amountParam = Number(searchParams.get('amount')) || 94800;

  const [billingInfo, setBillingInfo] = useState<{
    billingKey?: string;
    nextBillingDate?: string;
    cardCompany?: string;
    cardNumber?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Case: User intentionally canceled payment
    if (isUserCancel) {
      recordPaymentCancelAction(
        orderId || `order_cancel_${Date.now()}`,
        errorMessage || '사용자에 의해 결제가 취소되었습니다.'
      );
      setPaymentState('CANCELED');
      return;
    }

    // 2. Case: Payment failed via redirect
    if (errorCode || errorMessage) {
      recordPaymentFailAction(
        orderId || `order_fail_${Date.now()}`,
        errorCode || 'PAYMENT_FAILED',
        errorMessage || '결제 승인 처리에 실패했습니다.',
        Number(amountStr) || 0
      );
      setPaymentState('FAILED');
      return;
    }

    // 3. Case: Billing key authorization (토스페이먼츠 자동결제 빌링키 발급 및 첫 회 결제)
    if (authKey && customerKey) {
      let actionPromise = globalBillingPromises.get(authKey);
      if (!actionPromise) {
        actionPromise = import('../actions/payment.server-actions').then(
          ({ issueAndActivateBillingAction }) =>
            issueAndActivateBillingAction({
              authKey,
              customerKey,
              plan: planParam === 'Team' ? 'TEAM' : 'PRO',
              amount: amountParam,
            })
        );
        globalBillingPromises.set(authKey, actionPromise);
      }

      actionPromise.then((res) => {
        if (!isMounted) return;
        if (res.success && res.result) {
          setReceipt({
            paymentKey: res.result.billingKey,
            orderId: res.result.orderId,
            orderName: res.result.orderName,
            status: 'DONE',
            totalAmount: res.result.amount,
            method: '카드 (정기결제)',
            approvedAt: res.result.paidAt,
            receiptUrl: res.result.receiptUrl,
            card: {
              number: res.result.card?.number,
              cardType: res.result.card?.cardType,
            },
          });
          setBillingInfo({
            billingKey: res.result.billingKey,
            nextBillingDate: res.result.nextBillingDate,
            cardCompany: res.result.card?.company,
            cardNumber: res.result.card?.number,
          });
          setPaymentState('SUCCESS');
        } else {
          setErrorDetails(res.error || '빌링키 발급 및 정기 결제 승인에 실패했습니다.');
          setPaymentState('FAILED');
        }
      });
      return;
    }

    // 4. Case: Traditional paymentKey confirmation (fallback)
    if (!paymentKey || !orderId || !amountStr) {
      // Demo sandbox fallback confirmation
      confirmPaymentAction('CN-TEST-KEY-8821', 'order_pro_yearly_demo', 94800).then((res) => {
        if (!isMounted) return;
        if (res.success && res.receipt) {
          setReceipt(res.receipt);
          setPaymentState('SUCCESS');
        } else {
          setErrorDetails(res.error || '결제 승인 처리 중 문제가 발생했습니다.');
          setPaymentState('FAILED');
        }
      });
      return;
    }

    confirmPaymentAction(paymentKey, orderId, Number(amountStr)).then((res) => {
      if (!isMounted) return;
      if (res.success && res.receipt) {
        setReceipt(res.receipt);
        setPaymentState('SUCCESS');
      } else {
        setErrorDetails(res.error || '결제 승인 처리 중 문제가 발생했습니다.');
        setPaymentState('FAILED');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isUserCancel, errorCode, errorMessage, authKey, customerKey, paymentKey, orderId, amountStr, planParam, amountParam]);

  if (paymentState === 'LOADING') {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12 px-6">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            토스페이먼츠 결제 데이터 처리 중...
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            서버와 안전하게 결제 트랜잭션 및 구독 상태를 연동하고 있습니다.
          </span>
        </div>
      </div>
    );
  }

  // 1. UI for User Intentionally Canceled
  if (paymentState === 'CANCELED') {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12 px-6">
        <div className="w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-xl border border-amber-500/20 p-8 sm:p-12 flex flex-col gap-6 text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl shadow-xs">
            <span className="material-symbols-outlined text-3xl">cancel</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-label-sm text-label-sm font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              STATUS: CANCELED (취소됨)
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
              사용자에 의해 결제가 취소되었습니다
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
              결제 모듈 진행 중 취소를 선택하셨습니다. 결제 금액은 청구되지 않았으며, 결제 시도 상태가 <strong className="text-on-surface font-semibold">&ldquo;취소됨(CANCELED)&rdquo;</strong>으로 안전하게 저장되었습니다.
            </p>
          </div>
          <div className="w-full bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 text-left text-sm space-y-1.5 text-on-surface-variant">
            <div className="flex justify-between">
              <span>주문 식별 번호:</span>
              <span className="font-mono text-on-surface font-medium">{orderId || 'CN-CANCELED'}</span>
            </div>
            <div className="flex justify-between">
              <span>상태 기록:</span>
              <span className="text-amber-600 font-semibold">CANCELED (사용자 취소)</span>
            </div>
            <div className="flex justify-between">
              <span>권한 상태:</span>
              <span className="text-error font-medium">노트 CRUD 권한 미부여</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              href="/pricing"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all shadow-xs inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">replay</span>
              <span>다시 결제 진행하기</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all"
            >
              대시보드로 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. UI for Payment Failed
  if (paymentState === 'FAILED') {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12 px-6">
        <div className="w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-xl border border-error/20 p-8 sm:p-12 flex flex-col gap-6 text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center text-3xl shadow-xs">
            <span className="material-symbols-outlined text-3xl text-error">error</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/40 text-error font-label-sm text-label-sm font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-error" />
              STATUS: FAILED (승인 실패)
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
              결제 처리에 실패했습니다
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mb-4">
              결제 시도 중 카드사 승인 거절 또는 시스템 오류가 발생하여 상태가 <strong className="text-error font-semibold">&ldquo;실패(FAILED)&rdquo;</strong>로 기록되었습니다.
            </p>
            <div className="font-body-sm text-body-sm text-error bg-error-container/20 p-3.5 rounded-xl border border-error/20 text-left font-mono break-all">
              {errorDetails || `[${errorCode || 'FAILED'}] ${errorMessage || '결제 승인 실패'}`}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              href="/pricing"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all shadow-xs inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>결제 다시 시도하기</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all"
            >
              대시보드로 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12 px-6">
      <div className="w-full max-w-4xl bg-surface-container-lowest rounded-3xl shadow-xl border border-outline-variant/20 p-8 sm:p-12 flex flex-col gap-8">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/15">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-3xl shadow-xs">
              <span className="material-symbols-outlined text-3xl text-secondary">
                check_circle
              </span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary-fixed/40 text-secondary font-label-sm text-label-sm font-semibold mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                TXN_CONFIRMED • #{receipt?.orderId || 'CN-89042'}
              </div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
                결제가 성공적으로 완료되었습니다!
              </h1>
              <p className="font-body-sm text-body-sm text-secondary font-medium">
                노트를 생성, 수정, 삭제, 조회할 수 있는 모든 권한이 활성화되었습니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/notes"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">article</span>
              <span>노트 관리 및 조회</span>
            </Link>
            <Link
              href="/notes/new"
              className="px-4 py-2.5 rounded-xl bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-label-md text-label-md transition-all font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>새 노트 작성</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all"
            >
              대시보드로 가기
            </Link>
          </div>
        </div>

        {/* Permission Granted Highlight Callout */}
        <div className="p-4 rounded-2xl bg-secondary-container/20 border border-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-2xl">verified</span>
            <div>
              <span className="font-label-md text-label-md font-bold text-on-surface block">
                노트 CRUD (생성·수정·삭제·조회) 권한 활성화 완료
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                토스페이먼츠 승인이 성공적으로 등록되었습니다. 워크스페이스의 모든 노트를 제약 없이 작성하고 관리하실 수 있습니다.
              </span>
            </div>
          </div>
          <Link
            href="/notes"
            className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold hover:bg-secondary/90 transition-all text-center shrink-0"
          >
            노트 목록 바로가기 →
          </Link>
        </div>

        {/* 2-Column Details: Receipt + Onboarding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Receipt Summary */}
          <div className="p-6 rounded-2xl bg-surface-container-low flex flex-col gap-4 border border-outline-variant/15">
            <span className="font-title text-title text-on-surface font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
              전자 결제 영수증 (토스페이먼츠 승인)
            </span>
            <div className="space-y-3 font-body-sm text-body-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>구매 상품</span>
                <span className="font-semibold text-on-surface">{receipt?.orderName || 'CloudNote Pro (연간 결제)'}</span>
              </div>
              <div className="flex justify-between">
                <span>주문 번호</span>
                <span className="font-code text-xs text-on-surface">{receipt?.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>결제 수단</span>
                <span className="text-on-surface">
                  {receipt?.method}
                  {receipt?.card?.number ? ` (${receipt.card.number})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>승인 일시</span>
                <span className="text-on-surface">
                  {receipt?.approvedAt ? new Date(receipt.approvedAt).toLocaleString('ko-KR') : '방금 전'}
                </span>
              </div>
              {billingInfo?.nextBillingDate && (
                <div className="flex justify-between text-primary font-medium bg-primary/5 p-2 rounded-lg">
                  <span>다음 자동 결제일 (30일 주기)</span>
                  <span className="font-semibold">
                    {new Date(billingInfo.nextBillingDate).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-outline-variant/20 flex justify-between font-headline-sm text-headline-sm font-bold text-on-surface">
                <span>최종 승인 금액</span>
                <span className="text-primary font-bold">
                  ₩{receipt?.totalAmount ? receipt.totalAmount.toLocaleString() : '94,800'}
                </span>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="flex items-center gap-2 pt-2">
              {receipt?.receiptUrl ? (
                <a
                  href={receipt.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium transition-colors text-center inline-flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  <span>토스페이먼츠 영수증 보기</span>
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>매출전표 출력</span>
              </button>
            </div>
          </div>

          {/* Right: Pro Onboarding Tips */}
          <div className="p-6 rounded-2xl bg-surface-container-low flex flex-col gap-4 border border-outline-variant/15">
            <span className="font-title text-title text-on-surface font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-xl">rocket_launch</span>
              Pro 플랜 온보딩 가이드
            </span>
            <div className="space-y-3 font-body-sm text-body-sm text-on-surface-variant">
              <div className="p-3 rounded-xl bg-surface-container-lowest flex items-start gap-3 shadow-2xs">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">auto_awesome</span>
                <div>
                  <span className="font-semibold text-on-surface block">AI 스마트 자동 요약</span>
                  <span>문서 작성 후 상단 &apos;AI 생성&apos; 버튼으로 3줄 요약과 액션 아이템을 즉시 추출해 보세요.</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-lowest flex items-start gap-3 shadow-2xs">
                <span className="material-symbols-outlined text-secondary text-lg mt-0.5">group</span>
                <div>
                  <span className="font-semibold text-on-surface block">실시간 다중 협업</span>
                  <span>팀원 초대 링크를 통해 0ms 동시 커서 편집과 충돌 없는 CRDT 협업을 경험할 수 있습니다.</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-lowest flex items-start gap-3 shadow-2xs">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">verified_user</span>
                <div>
                  <span className="font-semibold text-on-surface block">Zero-Knowledge E2E 보안</span>
                  <span>클라이언트 256-bit AES 암호화로 데이터가 종단간 완벽하게 보호됩니다.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
