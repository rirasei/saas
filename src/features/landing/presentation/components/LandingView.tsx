'use client';

import React from 'react';
import Link from 'next/link';
import { LandingData } from '../../domain/models/LandingData';
import { Badge, AvatarGroup, TagChip } from '@/src/shared/components';

interface LandingViewProps {
  data: LandingData;
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

export const LandingView: React.FC<LandingViewProps> = ({ data }) => {
  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {/* Main Body */}
      <div className="w-full pt-16 bg-surface">
        <div className="flex flex-col w-full overflow-hidden">
          {/* Top Ambient Glow */}
          <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-20">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[340px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-1/3 left-1/4 w-[380px] h-[260px] bg-secondary/10 rounded-full blur-2xl pointer-events-none -z-10" />

            {/* Hero Content */}
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
              <Badge variant="neutral" pulse>
                <span className="text-primary font-semibold tracking-wide uppercase">{data.hero.badge}</span>
                <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-on-surface tracking-tight font-bold leading-tight">
                생각을 기록하고,
                <br className="hidden sm:inline" />팀과{' '}
                <span className="text-primary underline decoration-primary-fixed decoration-4 underline-offset-8">
                  실시간으로 연결
                </span>
                하세요
              </h1>

              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
                {data.hero.subheadline}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full sm:w-auto">
                <Link
                  href="/auth?mode=signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  <span>{data.hero.trialText}</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container shadow-xs transition-all hover:scale-[1.02] border border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">
                    play_circle
                  </span>
                  <span>라이브 데모 보기</span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-secondary">
                    check_circle
                  </span>
                  <span>신용카드 등록 불필요</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-secondary">
                    check_circle
                  </span>
                  <span>언제든 취소 가능</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-secondary">
                    check_circle
                  </span>
                  <span>무제한 로컬 캐싱</span>
                </div>
              </div>
            </div>

            {/* Product Canvas Mockup */}
            <div className="mt-14 relative max-w-5xl mx-auto">
              <div className="rounded-2xl bg-surface-container-lowest shadow-2xl overflow-hidden p-1.5 sm:p-2 bg-gradient-to-b from-surface-container-high/60 to-surface-container-low/40 border border-outline-variant/30">
                <div className="rounded-xl bg-surface-container-lowest overflow-hidden flex flex-col border border-outline-variant/15">
                  {/* Editor Topbar */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant/15">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-error/70 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                      <span className="ml-3 font-code text-xs text-on-surface-variant">
                        workspace / product-spec-v2.md
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" pulse size="sm">
                        0.04s 실시간 동기화됨
                      </Badge>
                      <AvatarGroup
                        users={[{ name: '민' }, { name: 'J' }, { name: 'K' }]}
                        size="xs"
                      />
                    </div>
                  </div>

                  {/* Split Workbench Preview */}
                  <div className="grid grid-cols-12 min-h-[380px]">
                    {/* Left Explorer */}
                    <div className="hidden md:block col-span-3 bg-surface-container-low p-4 space-y-3 border-r border-outline-variant/15">
                      <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                        <span>프로젝트 노트</span>
                        <span className="material-symbols-outlined text-sm">create_new_folder</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container text-primary font-label-md text-label-md font-medium">
                          <span className="material-symbols-outlined text-sm">article</span>
                          <span className="truncate">Q4 제품 로드맵 기획</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-body-sm text-body-sm">
                          <span className="material-symbols-outlined text-sm">code</span>
                          <span className="truncate">GraphQL 캐싱 설계서</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-body-sm text-body-sm">
                          <span className="material-symbols-outlined text-sm">smart_toy</span>
                          <span className="truncate">AI 모델 서빙 레이턴시</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-body-sm text-body-sm">
                          <span className="material-symbols-outlined text-sm">folder</span>
                          <span className="truncate">팀 회의록 아카이브</span>
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="p-3 rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/15 space-y-2">
                          <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            <span>AI 실시간 보조</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                            작성 중인 기술 스펙에서 보안 체크리스트 4개 항목을 자동 감지했습니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Center/Right Canvas */}
                    <div className="col-span-12 md:col-span-9 p-6 sm:p-8 flex flex-col justify-between bg-surface-container-lowest">
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <TagChip tag="#아키텍처" color="secondary" />
                          <TagChip tag="#v3_마이그레이션" color="secondary" />
                          <TagChip tag="#실시간협업" color="secondary" />
                        </div>
                        <h2 className="font-headline-md text-2xl text-on-surface font-semibold tracking-tight">
                          Q4 제품 로드맵 및 오프라인-퍼스트 동기화 프로토콜
                        </h2>
                        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                          CloudNote는 CRDT (Conflict-free Replicated Data Types) 알고리즘을 활용하여 수백 명의 동시 편집 세션에서도 데이터 충돌 없이 매끄러운 텍스트 병합을 보장합니다.
                        </p>

                        {/* Mockup Active Cursor */}
                        <div className="p-4 rounded-xl bg-surface-container-low space-y-2 relative border border-outline-variant/10">
                          <div className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-xs shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-on-primary animate-ping" />
                            <span>김민석 PM 편집 중</span>
                          </div>
                          <p className="font-code text-on-surface pt-1 leading-relaxed text-xs sm:text-sm">
                            &gt; [x] WebSocket 저지연 연결 수립<br />
                            &gt; [x] SQLite 로컬 암호화 스토리지 연동<br />
                            &gt; [ ] 대용량 미디어 비동기 청크 업로드 (진행중)
                          </p>
                        </div>
                      </div>

                      {/* Inline Quick Stat Bar inside Editor Mockup */}
                      <div className="pt-6 flex flex-wrap items-center justify-between text-on-surface-variant font-label-sm text-label-sm border-t border-outline-variant/15 mt-6">
                        <div className="flex items-center gap-4">
                          <span>단어 수: 1,428</span>
                          <span>읽는 시간: 약 3분</span>
                          <span className="text-secondary font-medium">AI 요약 완료</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <span className="material-symbols-outlined text-sm">cloud_done</span>
                          <span>클라우드 영구 저장됨</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Key Metrics Ribbon */}
          <section className="w-full bg-surface-container-low py-12 border-y border-outline-variant/15">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {data.metrics.map((metric) => (
                <div key={metric.id} className="space-y-1">
                  <p className={`font-headline-lg text-3xl sm:text-4xl font-bold ${metric.colorClass}`}>
                    {metric.value}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. 3-Column Core Features Section */}
          <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-24 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                주요 기능 살펴보기
              </span>
              <h2 className="font-headline-lg text-3xl sm:text-4xl text-on-surface font-bold tracking-tight">
                기록에 몰입하도록 돕는 가장 강력한 도구
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                메모 작성부터 분류, 협업까지 불필요한 마찰을 완전히 없앴습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature Card 1 */}
              <div className="p-8 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6 group border border-outline-variant/15">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <span className="material-symbols-outlined text-2xl">sync</span>
                  </div>
                  <h3 className="font-headline-sm text-xl text-on-surface font-semibold">
                    초고속 클라우드 동기화
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    비행기나 지하철 등 네트워크 연결이 끊긴 오프라인 환경에서도 작업하세요. 재연결 시 0.1초 만에 최신 변경분만 지능적으로 증분 백업합니다.
                  </p>
                </div>
                {/* Visual Component: Sync Sparkline */}
                <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">백업 성공률</span>
                    <p className="font-title text-title text-primary font-bold">100.0%</p>
                  </div>
                  <svg className="w-24 h-8 text-primary" fill="none" viewBox="0 0 100 30">
                    <path
                      d="M0 25 L20 18 L40 22 L60 8 L80 12 L100 3"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-8 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6 group border border-outline-variant/15">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                    <span className="material-symbols-outlined text-2xl">neurology</span>
                  </div>
                  <h3 className="font-headline-sm text-xl text-on-surface font-semibold">
                    AI 지능형 요약 & 자동 분류
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    긴 회의록과 방대한 리서치 자료를 클릭 한 번으로 핵심 요약본으로 추출합니다. 문맥을 파악해 연관 태그를 알아서 부여해 줍니다.
                  </p>
                </div>
                {/* Visual Component: AI Tag badges */}
                <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-label-sm">
                    <span className="material-symbols-outlined text-sm text-secondary">auto_fix_high</span>
                    <span>추천 태그 자동 생성</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary font-label-sm text-xs font-medium">
                      #전략기획
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-label-sm text-xs font-medium">
                      #스프린트_04
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-label-sm text-xs font-medium">
                      +3개 더
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="p-8 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6 group border border-outline-variant/15">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <span className="material-symbols-outlined text-2xl">edit_note</span>
                  </div>
                  <h3 className="font-headline-sm text-xl text-on-surface font-semibold">
                    블록 에디터 & 마크다운
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    키보드만으로 작동하는 슬래시(/) 명령어와 수식(KaTeX), 코드 하이라이팅, 다이어그램을 막힘없이 작성하는 직관적인 블록 아키텍처.
                  </p>
                </div>
                {/* Visual Component: Block Keyboard Preview */}
                <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-surface-container-lowest shadow-xs font-code text-xs font-bold text-on-surface border border-outline-variant/15">
                      /table
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                      스프레드시트 삽입
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    keyboard_return
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Realtime Collaboration & Security Highlight Section */}
          <section className="w-full bg-surface-container-low py-24 border-y border-outline-variant/15">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary font-label-sm text-label-sm font-medium">
                  <span className="material-symbols-outlined text-sm">lock_person</span>
                  <span>엔터프라이즈급 신뢰성</span>
                </div>
                <h2 className="font-headline-lg text-3xl sm:text-4xl text-on-surface font-bold tracking-tight">
                  실시간 동시 협업과
                  <br />타협 없는 데이터 보안
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  동료들이 각자의 위치에서 문서를 함께 완성하는 과정을 실시간 커서로 확인하세요. 제로 지식 암호화(Zero-Knowledge Encryption) 방식을 도입하여, CloudNote 팀조차 고객의 원본 노트를 열람할 수 없습니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs space-y-2 border border-outline-variant/15">
                    <span className="material-symbols-outlined text-primary text-2xl">shield</span>
                    <h4 className="font-title text-title text-on-surface font-semibold">
                      E2E 엔드투엔드 암호화
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      클라이언트 단말기에서 로컬 암호화 후 클라우드로 전송됩니다.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs space-y-2 border border-outline-variant/15">
                    <span className="material-symbols-outlined text-secondary text-2xl">group</span>
                    <h4 className="font-title text-title text-on-surface font-semibold">
                      다중 사용자 실시간 락
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      동일 단락 충돌 없는 세분화된 블록 잠금 제어를 지원합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Collaboration & Cursor Showcase Visual */}
              <div className="lg:col-span-6">
                <div className="p-6 sm:p-8 rounded-2xl bg-surface-container-lowest shadow-xl space-y-6 relative overflow-hidden border border-outline-variant/15">
                  <div className="flex items-center justify-between pb-4 bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/10">
                    <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary" /> 3명의 멤버 동시 참여 중
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-code">
                      v12.4.0
                    </span>
                  </div>
                  <div className="space-y-4 font-body-md text-body-md">
                    <div className="p-4 rounded-xl bg-surface-container-low relative border border-outline-variant/10">
                      <p className="text-on-surface">
                        “신규 AI 모델의 토큰 레이트 리밋 정책을 다음과 같이 정의합니다.”
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-xs">
                        <span>Sarah (DevOps)</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-on-primary" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-primary-fixed/30 relative border border-primary/20">
                      <p className="text-on-surface">
                        “초당 120회 요청 제한 시 클라이언트 피드백 UX 처리 방안 확인 필요.”
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-xs">
                        <span>David (Product Designer)</span>
                      </div>
                    </div>
                    {/* Encryption Status Indicator */}
                    <div className="flex items-center justify-between pt-2 px-2 text-on-surface-variant font-label-sm text-label-sm">
                      <span className="flex items-center gap-1.5 text-secondary font-medium">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>SHA-256 서명 인증 통과</span>
                      </span>
                      <span>지연율 18ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Social Proof & Reviews */}
          <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-24 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1 text-tertiary">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
                <span className="ml-2 font-title text-title text-on-surface font-bold">
                  4.9 / 5.0
                </span>
              </div>
              <h2 className="font-headline-lg text-3xl sm:text-4xl text-on-surface font-bold tracking-tight">
                프로덕트 리더들이 매일 선택하는 이유
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                기록의 속도가 곧 제품의 실행력입니다. 글로벌 테크 팀들의 실제 평가를 확인하세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {data.testimonials.map((review) => (
                <div
                  key={review.id}
                  className="p-8 rounded-2xl bg-surface-container-lowest shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-6 border border-outline-variant/15"
                >
                  <div className="space-y-4">
                    <div className="flex text-tertiary">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className="material-symbols-outlined text-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                      {review.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      className="w-11 h-11 rounded-full object-cover border border-outline-variant/20"
                      src={review.avatarUrl}
                      alt={review.author}
                    />
                    <div>
                      <h4 className="font-title text-title text-on-surface text-sm font-semibold">
                        {review.author}
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                        {review.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Bottom High-Impact Conversion CTA Banner */}
          <section id="pricing" className="w-full max-w-7xl mx-auto px-6 lg:px-12 pb-16">
            <div className="relative rounded-3xl bg-primary text-on-primary px-8 sm:px-16 py-16 overflow-hidden shadow-2xl">
              {/* Abstract Ambient Shapes */}
              <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-6">
                <span className="inline-block px-3 py-1 rounded-full bg-on-primary/10 text-on-primary font-label-sm text-label-sm tracking-wide">
                  14일 무료 체험 기간 제공
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                  지금 가입하고 스마트한 기록의 시작을 경험하세요
                </h2>
                <p className="font-body-lg text-body-lg text-primary-fixed leading-relaxed">
                  분산된 생각을 하나의 체계적인 지식 자산으로 전환하세요. 2분이면 워크스페이스 세팅이 완료됩니다.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                  <Link
                    href="/auth?mode=signup"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-all shadow-lg hover:scale-[1.02] active:scale-[0.99]"
                  >
                    <span>무료로 워크스페이스 생성</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                  <a
                    href="#pricing"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('현재 결제 기능 연동 준비 중입니다. 무료 체험(Starter/Pro)은 회원가입 시 즉시 이용 가능합니다!');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-on-primary/10 text-on-primary font-label-md text-label-md hover:bg-on-primary/20 transition-all cursor-pointer"
                  >
                    <span>요금제 비교하기</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
