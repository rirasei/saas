'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardData } from '../../domain/models/DashboardData';
import { WorkspaceLayout, Badge, TagChip } from '@/src/shared/components';

import { cancelSubscriptionAction } from '@/src/features/subscription/presentation/actions/payment.server-actions';

interface DashboardViewProps {
  initialData: DashboardData;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ initialData }) => {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedTag, setSelectedTag] = useState<string>('#전체');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const togglePin = (noteId: string) => {
    setData((prev) => ({
      ...prev,
      recentNotes: prev.recentNotes.map((note) =>
        note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
      ),
    }));
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

  const isPeriodValid = data.subscription?.currentPeriodEnd
    ? new Date(data.subscription.currentPeriodEnd).getTime() > Date.now()
    : false;
  const nextBillingFormatted = formatDate(data.subscription?.currentPeriodEnd);

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const res = await cancelSubscriptionAction('대시보드 페이지에서 직접 구독 취소');
      if (res.success) {
        setData((prev) => ({
          ...prev,
          subscription: prev.subscription
            ? {
                ...prev.subscription,
                status: 'CANCELED',
                cancelAtPeriodEnd: true,
              }
            : null,
        }));
        setToastMessage({
          type: 'success',
          text:
            res.message ||
            `구독이 성공적으로 취소되었습니다. 등록된 결제 수단(빌링키)이 삭제되었으며, ${nextBillingFormatted}까지 모든 서비스 이용 권한이 정상 유지됩니다.`,
        });
        setShowCancelModal(false);
      } else {
        setToastMessage({
          type: 'error',
          text: res.message || '구독 취소에 실패했습니다.',
        });
      }
    } catch {
      setToastMessage({
        type: 'error',
        text: '구독 취소 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const { user, metrics, recentNotes, folders, tags, activities } = data;

  const filteredNotes =
    selectedTag === '#전체'
      ? recentNotes
      : recentNotes.filter((note) =>
          note.tags.some((tag) => tag.includes(selectedTag.replace(/[^가-힣a-zA-Z]/g, '')))
        );

  return (
    <WorkspaceLayout user={user}>
      <div className="relative pt-16 w-full min-h-screen bg-surface">
        <div className="flex flex-col w-full pb-16">
            {/* Toast Alert Message */}
            {toastMessage && (
              <div className="mx-8 mt-4 p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all bg-emerald-500/10 border-emerald-500/20 text-emerald-800">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                  <span className="font-body-sm text-body-sm font-medium">{toastMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* Top Welcome & Ambient Banner */}
            <section className="relative px-8 pt-8 pb-6 overflow-hidden">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-24 right-12 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-col gap-1.5 max-w-2xl">
                  <Badge variant="secondary" pulse className="w-fit">
                    <span className="font-semibold uppercase tracking-wide">Workspace Live</span>
                    <span className="mx-1 text-outline-variant">•</span>
                    <span>동기화 완료</span>
                  </Badge>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                    좋은 하루입니다, <span className="text-primary font-bold">{user.name}</span>님! ☀️
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    오늘 팀원들과 함께{' '}
                    <span className="font-title text-title text-on-surface font-semibold">
                      3개의 메모
                    </span>
                    가 업데이트되었습니다. 집중해서 아이디어를 펼쳐보세요.
                  </p>
                </div>

                {/* Quick Actions Group */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  {/* Subscription Status Chip & Cancel Button */}
                  {data.subscription?.status === 'ACTIVE' && (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-label-sm text-xs text-on-surface font-semibold">
                        {data.subscription.plan || 'Pro'} 구독 중
                      </span>
                      {data.subscription.currentPeriodEnd && (
                        <>
                          <span className="text-outline-variant text-xs">•</span>
                          <span className="font-body-sm text-xs text-on-surface-variant">
                            {nextBillingFormatted}까지
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="ml-1.5 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                        title="구독 취소"
                      >
                        <span className="material-symbols-outlined text-xs">cancel</span>
                        <span>구독 취소</span>
                      </button>
                    </div>
                  )}

                  {data.subscription?.status === 'CANCELED' && (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-label-sm text-xs text-amber-700 font-semibold">
                        {isPeriodValid
                          ? `구독 취소됨 (${nextBillingFormatted}까지 이용 가능)`
                          : '구독 만료됨'}
                      </span>
                      <Link
                        href="/pricing"
                        className="ml-1.5 px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                      >
                        구독 재개
                      </Link>
                    </div>
                  )}

                  <div className="relative hidden sm:flex items-center">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container shadow-xs hover:bg-surface-container-high transition-colors cursor-pointer group border border-outline-variant/15"
                    >
                      <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg">
                        search
                      </span>
                      <span className="font-body-sm text-body-sm text-outline select-none">
                        빠른 검색
                      </span>
                      <kbd className="font-code text-code px-1.5 py-0.5 rounded bg-surface-container-lowest text-outline-variant shadow-xs text-xs font-semibold">
                        ⌘K
                      </kbd>
                    </button>
                  </div>
                  <Link
                    href="/notes/new"
                    className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-md hover:shadow-lg hover:bg-primary-container transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:rotate-90 duration-300">
                      add
                    </span>
                    <span className="font-semibold">+ 새 노트 작성</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* Cancel Confirmation Modal Dialog */}
            {showCancelModal && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-cancel-dialog-title"
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
                      <h3
                        id="dashboard-cancel-dialog-title"
                        className="font-title-lg text-title-lg font-bold text-on-surface"
                      >
                        정말 구독을 취소하시겠습니까?
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        CloudNote {data.subscription?.plan || 'Pro'} 정기 결제 해지 확인
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
                        구독을 취소하시더라도 이미 결제하신{' '}
                        <strong>
                          {nextBillingFormatted}까지는 모든 노트 작성, 수정, 조회 및 AI 기능이 중단
                          없이 정상 유지
                        </strong>
                        됩니다.
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
                        등록된 <strong>토스페이먼츠 정기 결제 빌링키는 즉시 안전하게 삭제</strong>
                        되며, 다음 결제일부터 추가 요금이 청구되지 않습니다.
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant/80 mb-6 leading-relaxed">
                    * 구독 만료 전 언제든지 요금제 페이지에서 클릭 한 번으로 구독을 다시 재개하실 수 있습니다.
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
                      disabled={isCancelling}
                      onClick={handleCancelSubscription}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-label-md text-label-md font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isCancelling ? (
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


            {/* 4-Split Metric Status Grid */}
            <section className="px-8 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Total Notes */}
                <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      전체 메모
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">description</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-display text-on-surface font-bold tracking-tight">
                        {metrics.totalNotes}
                      </span>
                      <span className="font-body-sm text-body-sm text-outline-variant ml-1">개</span>
                    </div>
                    <span className="inline-flex items-center text-secondary font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      +{metrics.totalNotesChangePercent}%
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-1000"
                      style={{ width: '72%' }}
                    />
                  </div>
                </div>

                {/* Metric 2: Pinned / Starred Notes */}
                <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      즐겨찾는 고정 노트
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-display text-on-surface font-bold tracking-tight">
                        {metrics.pinnedNotes}
                      </span>
                      <span className="font-body-sm text-body-sm text-outline-variant ml-1">
                        개 중요 보관
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                      {metrics.pinnedRatioPercent}% 비중
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-tertiary h-full rounded-full transition-all duration-1000"
                      style={{ width: '38%' }}
                    />
                  </div>
                </div>

                {/* Metric 3: Created This Week */}
                <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      이번 주 작성 노트
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                      <span className="material-symbols-outlined text-xl">auto_stories</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-display text-on-surface font-bold tracking-tight">
                        {metrics.weeklyNotes}
                      </span>
                      <span className="font-body-sm text-body-sm text-outline-variant ml-1">
                        개 신규
                      </span>
                    </div>
                    <span className="inline-flex items-center text-secondary font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-sm">north_east</span>
                      목표 달성
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-secondary h-full rounded-full transition-all duration-1000"
                      style={{ width: '80%' }}
                    />
                  </div>
                </div>

                {/* Metric 4: Cloud Storage Usage */}
                <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      클라우드 저장 용량
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-xl">cloud_sync</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="font-headline-md text-headline-md text-on-surface font-bold">
                        1.4 <span className="font-body-sm text-body-sm text-outline font-normal">GB</span>
                      </span>
                      <span className="font-body-sm text-body-sm text-outline-variant ml-1">
                        / 15 GB
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-semibold">
                      {metrics.storageUsedPercent}%
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-1000"
                      style={{ width: `${metrics.storageUsedPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Notes & Folders Section (Split Asymmetric Layout) */}
            <section className="px-8 py-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Recent Notes Gallery (8 cols) */}
                <div className="xl:col-span-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-xl">history</span>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
                        최근 열어본 노트
                      </h2>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                        {recentNotes.length}개
                      </span>
                    </div>
                    <Link
                      href="/notes"
                      className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors inline-flex items-center gap-1 font-semibold"
                    >
                      전체 보기
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>

                  {/* 4-Card Gallery Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredNotes.map((note) => (
                      <article
                        key={note.id}
                        className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer border border-outline-variant/15"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {note.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-label-sm text-label-sm font-semibold"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              aria-label="즐겨찾기 토글"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(note.id);
                              }}
                              className={`hover:scale-110 transition-transform p-1 ${
                                note.isPinned ? 'text-tertiary' : 'text-outline-variant hover:text-tertiary'
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-lg"
                                style={note.isPinned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                              >
                                star
                              </span>
                            </button>
                          </div>
                          <Link href={`/notes/${note.id}`}>
                            <h3 className="font-title text-title text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-1 mb-2">
                              {note.title}
                            </h3>
                          </Link>
                          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                            {note.summary}
                          </p>
                        </div>
                        <div className="mt-5 pt-3 flex items-center justify-between text-outline-variant border-t border-outline-variant/10">
                          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span>{note.updatedAtText}</span>
                          </div>
                          <div className="flex items-center -space-x-1.5">
                            {note.collaborators.map((c, i) => (
                              <span
                                key={i}
                                title={c.name}
                                className={`w-6 h-6 rounded-full font-label-sm text-xs flex items-center justify-center font-bold ring-2 ring-surface-container-lowest ${c.colorClass}`}
                              >
                                {c.initial}
                              </span>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {/* Right Column: Folders & Tag Filters (4 cols) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                  {/* Folders Widget */}
                  <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col gap-4 border border-outline-variant/15">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">folder_open</span>
                        <h3 className="font-title text-title text-on-surface font-semibold">
                          카테고리 폴더
                        </h3>
                      </div>
                      <button
                        className="text-outline-variant hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
                        type="button"
                        aria-label="새 폴더 생성"
                      >
                        <span className="material-symbols-outlined text-lg">create_new_folder</span>
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {folders.map((folder) => {
                        const colorMap: Record<string, { bg: string; text: string; hoverBg: string }> = {
                          primary: { bg: 'bg-surface-container-high', text: 'text-primary', hoverBg: 'group-hover:bg-primary group-hover:text-on-primary' },
                          secondary: { bg: 'bg-surface-container-high', text: 'text-secondary', hoverBg: 'group-hover:bg-secondary group-hover:text-on-secondary' },
                          tertiary: { bg: 'bg-surface-container-high', text: 'text-tertiary', hoverBg: 'group-hover:bg-tertiary group-hover:text-on-tertiary' },
                          outline: { bg: 'bg-surface-container-high', text: 'text-outline', hoverBg: 'group-hover:bg-surface-variant group-hover:text-on-surface' },
                        };
                        const styling = colorMap[folder.colorClass] || colorMap.primary;

                        return (
                          <div
                            key={folder.id}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${styling.bg} ${styling.text} ${styling.hoverBg}`}
                              >
                                <span className="material-symbols-outlined text-lg">
                                  {folder.iconName}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                                  {folder.name}
                                </h4>
                                <span className="font-body-sm text-body-sm text-on-surface-variant">
                                  {folder.description}
                                </span>
                              </div>
                            </div>
                            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                              {folder.count}개
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tag Quick Filter Widget */}
                  <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col gap-3 border border-outline-variant/15">
                    <div className="flex items-center justify-between">
                      <h3 className="font-title text-title text-on-surface font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">sell</span>
                        태그 필터
                      </h3>
                      <span className="font-label-sm text-label-sm text-outline-variant">
                        총 {tags.length}개
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((tag) => (
                        <TagChip
                          key={tag.id}
                          tag={tag.name}
                          selected={selectedTag === tag.name}
                          onClick={() => setSelectedTag(tag.name)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity Timeline & List Table Section */}
            <section className="px-8 py-4">
              <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col gap-5 border border-outline-variant/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-xl">dataset</span>
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
                        최근 활동 타임라인
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        워크스페이스 내 멤버들의 실시간 편집 및 협업 이력
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-on-surface transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">filter_list</span>
                      <span>필터: 모든 활동</span>
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-on-surface transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>내보내기</span>
                    </button>
                  </div>
                </div>

                {/* Responsive Table Container */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low/70 text-on-surface-variant font-label-sm text-label-sm">
                        <th className="py-3 px-4 rounded-l-xl font-semibold" scope="col">
                          노트 제목
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          분류 카테고리
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          최종 수정자
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          상태
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          수정 시간
                        </th>
                        <th className="py-3 px-4 rounded-r-xl text-right font-semibold" scope="col">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {activities.map((act) => (
                        <tr
                          key={act.id}
                          className="hover:bg-surface-container-low/50 transition-colors group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary text-lg">
                                draft
                              </span>
                              <div className="flex flex-col">
                                <Link
                                  href={`/notes/${act.noteId}`}
                                  className="font-title text-title text-on-surface font-medium group-hover:text-primary transition-colors cursor-pointer"
                                >
                                  {act.title}
                                </Link>
                                <span className="font-label-sm text-label-sm text-outline-variant">
                                  {act.versionText}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-label-sm text-label-sm">
                              📁 {act.folderName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-xs flex items-center justify-center font-bold">
                                {act.lastEditorInitial}
                              </span>
                              <span className="font-label-md text-label-md text-on-surface">
                                {act.lastEditorName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {act.status === 'SYNCED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                동기화 완료
                              </span>
                            )}
                            {act.status === 'EDITING' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed/50 text-primary font-label-sm text-label-sm font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                작성 중
                              </span>
                            )}
                            {act.status === 'READONLY' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                                읽기 전용
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-body-sm text-body-sm text-on-surface-variant">
                            {act.updatedAtText}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              aria-label="추가 옵션"
                              className="p-1 text-outline-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-lg">more_horiz</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Bottom Keyboard Shortcuts & Server Status Bar */}
            <div className="px-8 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-4">
                <span>
                  단축키 안내:{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-code text-xs">
                    ⌘N
                  </kbd>{' '}
                  새 노트{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-code text-xs ml-2">
                    ⌘K
                  </kbd>{' '}
                  통합 검색
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span>클라우드 서버 상태: 서울(ap-northeast-2) 리전 정상 가동 중</span>
              </div>
            </div>
          </div>
        </div>
    </WorkspaceLayout>
  );
};
