'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { WorkspaceLayout, Badge, TagChip } from '@/src/shared/components';
import {
  saveNoteTitleAction,
  toggleNotePinAction,
  toggleChecklistAction,
} from '../actions/note.server-actions';

interface NoteEditorViewProps {
  initialNote: NoteDetail;
  hasPermission?: boolean;
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export const NoteEditorView: React.FC<NoteEditorViewProps> = ({
  initialNote,
  hasPermission = false,
  user,
}) => {
  const router = useRouter();
  const [note, setNote] = useState<NoteDetail>(initialNote);
  const [title, setTitle] = useState(initialNote.title);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isStarred, setIsStarred] = useState(initialNote.isPinned);
  const [copiedCode, setCopiedCode] = useState(false);
  const [tags, setTags] = useState(initialNote.tags);
  const [hasAiSecurityBlock, setHasAiSecurityBlock] = useState(false);

  const toggleStar = async () => {
    if (!hasPermission) {
      alert('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
      return;
    }
    const nextState = !isStarred;
    setIsStarred(nextState);
    if (note.id !== 'new') {
      try {
        await toggleNotePinAction(note.id, nextState);
      } catch (err) {
        console.error('Failed to toggle pin', err);
      }
    }
  };

  const handleTitleChange = (val: string) => {
    if (!hasPermission) {
      alert('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
      return;
    }
    setTitle(val);
  };

  const handleTitleBlur = async () => {
    if (!hasPermission) return;
    if (note.id !== 'new' && title.trim()) {
      try {
        await saveNoteTitleAction(note.id, title.trim());
      } catch (err) {
        console.error('Failed to save title', err);
      }
    }
  };

  const toggleTask = async (id: string) => {
    if (!hasPermission) {
      alert('결제가 완료된 회원만 체크리스트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
      return;
    }
    const current = note.checklists.find((t) => t.id === id);
    const nextCompleted = !current?.isCompleted;
    setNote((prev) => ({
      ...prev,
      checklists: prev.checklists.map((t) =>
        t.id === id ? { ...t, isCompleted: nextCompleted } : t
      ),
    }));
    try {
      await toggleChecklistAction(id, nextCompleted);
    } catch (err) {
      console.error('Failed to update checklist task', err);
    }
  };

  const handleCopyCode = () => {
    if (note.codeSnippet?.code) {
      navigator.clipboard?.writeText(note.codeSnippet.code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const completedCount = note.checklists.filter((t) => t.isCompleted).length;
  const progressPercent = Math.round((completedCount / (note.checklists.length || 1)) * 100);

  const handleAddSecuritySection = () => {
    setHasAiSecurityBlock(true);
    alert('AI 보안 규격 섹션이 문서에 성공적으로 추가되었습니다.');
  };

  return (
    <WorkspaceLayout user={user}>
      <div className="relative pt-16 w-full min-h-screen bg-surface">
        <div className="flex flex-col w-full">
            {/* Top Editor Status & Utility Bar (Sub-header) */}
            <div className="sticky top-16 z-30 flex items-center justify-between px-8 py-2.5 bg-surface/90 backdrop-blur-md shadow-xs border-b border-outline-variant/15">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/dashboard"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  title="뒤로가기"
                >
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
                {/* Breadcrumbs Path */}
                <nav className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
                  <Link href="/dashboard" className="hover:text-primary cursor-pointer transition-colors">
                    내 워크스페이스
                  </Link>
                  <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
                  <span className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors">
                    <span className="text-xs">📁</span> {note.folderName}
                  </span>
                  <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
                  <span className="text-on-surface font-semibold truncate max-w-[220px]">
                    {title}
                  </span>
                </nav>
                {/* Sync Status & Stats Capsule */}
                <div className="hidden xl:flex items-center gap-2 pl-4 ml-2 bg-surface-container-low px-3 py-1 rounded-full">
                  <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary font-medium">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      cloud_done
                    </span>
                    <span>{note.syncStatusText}</span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{note.wordCount}단어</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">읽는 시간 {note.readingTimeMinutes}분</span>
                </div>
              </div>

                <button
                  type="button"
                  onClick={toggleStar}
                  className="p-2 rounded-xl text-on-surface-variant hover:text-amber-500 hover:bg-surface-container-high transition-colors cursor-pointer"
                  title="즐겨찾기"
                >
                  <span
                    className={`material-symbols-outlined text-xl ${isStarred ? 'text-tertiary' : ''}`}
                    style={isStarred ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    star
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('AI가 문서 전체를 분석하여 요약 및 체크리스트를 최신화했습니다.')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-container/60 hover:bg-secondary-container text-on-secondary-container font-label-md text-label-md transition-all cursor-pointer"
                  title="AI 어시스턴트 호출"
                >
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  <span>AI 생성</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                  title="내보내기 (PDF, Markdown)"
                >
                  <span className="material-symbols-outlined text-xl">ios_share</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('공유 링크가 클립보드에 복사되었습니다.')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">group_add</span>
                  <span>공유</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                  className={`p-2 rounded-xl transition-colors ml-1 cursor-pointer ${
                    isInspectorOpen
                      ? 'bg-surface-container-high text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  title="우측 인스펙터 패널 접기/펼치기"
                >
                  <span className="material-symbols-outlined text-xl">side_navigation</span>
                </button>
              </div>
            </div>

            {/* Main Workspace Flex Layout (Canvas + Sticky Right Panel) */}
            <div className="flex flex-1 w-full relative">
              {/* Central Document Canvas Area */}
              <div className="flex-1 min-w-0 flex flex-col items-center pb-32">
                {/* Sticky Block Formatting Ribbon */}
                <div className="sticky top-[105px] z-20 mt-4 px-3 py-1.5 bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl shadow-md flex items-center gap-1 text-on-surface-variant max-w-2xl w-auto border border-outline-variant/20">
                  <button className="px-2.5 py-1 rounded-lg hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1 cursor-pointer" type="button">
                    <span>본문</span>
                    <span className="material-symbols-outlined text-sm text-outline">expand_more</span>
                  </button>
                  <span className="w-[1px] h-4 bg-outline-variant/40 mx-0.5" />
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center font-bold text-sm cursor-pointer" title="굵게 (⌘B)" type="button">
                    B
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center italic text-sm cursor-pointer" title="기울임 (⌘I)" type="button">
                    I
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center underline text-sm cursor-pointer" title="밑줄 (⌘U)" type="button">
                    U
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center line-through text-sm cursor-pointer" title="취소선" type="button">
                    S
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="인라인 코드" type="button">
                    <span className="material-symbols-outlined text-base">code</span>
                  </button>
                  <span className="w-[1px] h-4 bg-outline-variant/40 mx-0.5" />
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="글머리 기호 목록" type="button">
                    <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="번호 매기기" type="button">
                    <span className="material-symbols-outlined text-lg">format_list_numbered</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center cursor-pointer" title="할 일 체크리스트" type="button">
                    <span className="material-symbols-outlined text-lg">check_box</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="인용구" type="button">
                    <span className="material-symbols-outlined text-lg">format_quote</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="콜아웃 블록" type="button">
                    <span className="material-symbols-outlined text-lg">lightbulb</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="코드 블록" type="button">
                    <span className="material-symbols-outlined text-lg">terminal</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center cursor-pointer" title="표(Table)" type="button">
                    <span className="material-symbols-outlined text-lg">table</span>
                  </button>
                </div>

                {/* Editor Canvas Wrapper (Max optimal reading width: 800px) */}
                <article className="w-full max-w-[800px] px-6 mt-6 flex flex-col">
                  {/* Payment Permission Status Banner */}
                  {!hasPermission ? (
                    <div className="mb-6 p-5 rounded-2xl bg-surface-container-lowest border border-error/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-error text-2xl">lock</span>
                        <div>
                          <span className="font-label-md text-label-md font-bold text-on-surface block">
                            토스페이먼츠 미결제 상태 (읽기 전용 모드)
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            노트 생성, 제목 수정, 체크리스트 편집을 위해 토스페이먼츠 결제를 완료해 주세요.
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/pricing"
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold transition-all shadow-xs text-center shrink-0"
                      >
                        토스페이먼츠로 결제하기
                      </Link>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 rounded-xl bg-secondary-container/20 border border-secondary/30 flex items-center gap-2 font-label-sm text-label-sm text-secondary font-medium">
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>토스페이먼츠 결제 완료 • Pro 플랜 활성화됨 (노트 편집 및 저장 가능)</span>
                    </div>
                  )}

                  {/* Document Cover Banner Image */}
                  <div className="relative w-full h-44 rounded-3xl overflow-hidden bg-surface-container-high shadow-xs group">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: `url('${note.coverImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS2wjicWauQKqdUknrtNIHbIN4tOWu53eb0OkrfNIruKm07DqKssiSnwW5oG7XhGHM-ld_auNzXdTE-RKb3XJIsilEvpkv5b5AxPF0-IvtOcpEqnlSysf1uOY03WGWkZneK_pvV4rV0dRdn9hjB35bAk3l-LcdHFr7Ggp8TzxImLMy37K0tNBDSxpZsE2l8hRQWz7aTWUdlCKQzRMAvzpnsF8DPaIVWUPMhnvag97w07EA8oalGWjSJA'}')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <button className="px-2.5 py-1 rounded-lg bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm hover:bg-surface-container-lowest transition-all cursor-pointer" type="button">
                        커버 변경
                      </button>
                      <button className="px-2.5 py-1 rounded-lg bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm hover:bg-surface-container-lowest transition-all cursor-pointer" type="button">
                        위치 재조정
                      </button>
                    </div>
                  </div>

                  {/* Document Icon & Badges */}
                  <div className="relative -mt-8 ml-6 flex items-end justify-between z-10">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center text-3xl cursor-pointer hover:bg-surface-container-low transition-colors border border-outline-variant/20">
                        {note.iconEmoji}
                      </div>
                      <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs" title="이모지 변경" type="button">
                        <span className="material-symbols-outlined text-xs">edit</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">
                        {note.sprintBadge || 'Sprint 26.4'}
                      </Badge>
                      <Badge variant="neutral">
                        {note.priorityBadge || '우선순위: P0'}
                      </Badge>
                    </div>
                  </div>

                  {/* Document Main Editable Title */}
                  <div className="mt-6">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      onBlur={handleTitleBlur}
                      disabled={!hasPermission}
                      className="w-full font-headline-lg text-headline-lg text-on-surface outline-none tracking-tight font-bold bg-transparent border-b border-transparent focus:border-primary/40 transition-colors leading-tight disabled:opacity-75 disabled:cursor-not-allowed"
                      placeholder="제목 없는 메모"
                    />
                  </div>

                  {/* Metadata Tag Bar */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pb-4">
                    {tags.map((tag, idx) => (
                      <TagChip
                        key={idx}
                        tag={tag}
                        color="primary"
                        removable
                        onRemove={() => setTags(tags.filter((_, i) => i !== idx))}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newTag = prompt('추가할 태그를 입력하세요 (예: #백엔드):');
                        if (newTag) setTags([...tags, newTag.startsWith('#') ? newTag : `#${newTag}`]);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface-variant font-label-sm text-label-sm transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>태그 추가</span>
                    </button>
                  </div>

                  {/* Document Content Body Blocks */}
                  <div className="flex flex-col gap-6 mt-4 font-body-lg text-body-lg text-on-surface leading-relaxed">
                    {/* AI Executive Summary Callout Block */}
                    <div className="relative rounded-2xl bg-surface-container-low p-5 shadow-xs flex items-start gap-4 border border-secondary/20">
                      <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-xl">lightbulb</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-headline-sm text-headline-sm text-secondary font-semibold">
                            {note.aiSummary.title}
                          </span>
                          <span className="font-label-sm text-label-sm text-secondary/70">
                            {note.aiSummary.badgeText}
                          </span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                          {note.aiSummary.description}
                        </p>
                      </div>
                    </div>

                    {/* Section 1: Heading & Paragraph */}
                    <div className="flex flex-col gap-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                        1. 핵심 아키텍처 개편 개요
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        기존 WebSocket 폴백 체계를 개선하여 WebRTC 저지연 데이터 채널을 병행 지원합니다. 클라이언트 측 상태 영속성을 보장하기 위해 SQLite WASM 로컬 복제본을 유지하고, 0.1s 멱등성 버퍼를 통해 네트워크 단절 시에도 끊김 없는 작성 경험을 제공합니다.
                      </p>
                    </div>

                    {/* Section 2: Interactive Checklist Block */}
                    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                        <div className="flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface font-semibold">
                          <span className="material-symbols-outlined text-primary text-xl">task_alt</span>
                          <span>스프린트 마일스톤 할 일</span>
                        </div>
                        <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-secondary-fixed/40 text-secondary font-semibold">
                          완료율 {progressPercent}% ({completedCount}/{note.checklists.length})
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 pt-1">
                        {note.checklists.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className="flex items-start gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={task.isCompleted}
                              onChange={() => {}}
                              className="mt-1 w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                            />
                            <div className="flex-1">
                              <span
                                className={`font-body-md text-body-md ${
                                  task.isCompleted ? 'line-through text-outline' : 'text-on-surface'
                                }`}
                              >
                                {task.text}
                              </span>
                              {task.metadataText && (
                                <div className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                                  {task.metadataText}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Code Snippet Block (Syntax Highlighting) */}
                    {note.codeSnippet && (
                      <div className="rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/20 shadow-xs">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-high/60 text-on-surface-variant font-label-sm text-label-sm border-b border-outline-variant/15">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">code</span>
                            <span className="font-code font-semibold">{note.codeSnippet.filename}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {copiedCode ? 'done' : 'content_copy'}
                            </span>
                            <span>{copiedCode ? '복사됨!' : '코드 복사'}</span>
                          </button>
                        </div>
                        <pre className="p-4 bg-surface-container-lowest font-code text-code text-on-surface overflow-x-auto text-xs leading-relaxed">
                          {note.codeSnippet.code}
                        </pre>
                      </div>
                    )}

                    {/* Dynamic AI Injected Security Section */}
                    {hasAiSecurityBlock && (
                      <div className="p-5 rounded-2xl bg-secondary-container/20 border border-secondary/30 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-secondary font-headline-sm text-headline-sm font-semibold">
                          <span className="material-symbols-outlined text-xl">security</span>
                          <span>2. Zero-Knowledge E2E 종단간 암호화 규격</span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant">
                          클라이언트 단말기에서 AES-256-GCM 알고리즘으로 본문 블록을 대칭 암호화한 후 WebSocket 릴레이로 전송합니다. 서버 및 인프라 운영자는 원본 텍스트를 복호화할 수 없습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              </div>

              {/* Right Collapsible Inspector Panel */}
              {isInspectorOpen && (
                <aside className="w-80 shrink-0 border-l border-outline-variant/20 p-6 bg-surface-container-lowest h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                    <span className="font-title text-title text-on-surface font-semibold">문서 개요</span>
                    <button
                      type="button"
                      onClick={() => setIsInspectorOpen(false)}
                      className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                  <div className="mt-4 flex flex-col gap-4">
                    {/* Quick Insights AI Card */}
                    <div className="p-4 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm flex flex-col gap-1 border border-outline-variant/20">
                      <div className="flex items-center gap-1.5 text-primary font-semibold">
                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                        <span>AI 제안 인사이트</span>
                      </div>
                      <p className="text-on-surface-variant leading-relaxed text-xs mt-1">
                        보안 파트 섹션(Zero-Knowledge E2E Key Exchange)이 아직 미완성 상태입니다. 추가하시겠습니까?
                      </p>
                      <button
                        type="button"
                        onClick={handleAddSecuritySection}
                        className="mt-2 w-full py-1.5 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        보안 섹션 자동 추가
                      </button>
                    </div>

                    {/* Metadata Specs */}
                    <div className="pt-2 flex flex-col gap-2.5 font-label-sm text-label-sm text-on-surface-variant">
                      <div className="flex justify-between items-center">
                        <span>작성자</span>
                        <span className="font-semibold text-on-surface">{note.author.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>버전</span>
                        <span className="font-code text-xs bg-surface-container px-2 py-0.5 rounded">
                          {note.author.versionHash}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>암호화</span>
                        <span className="text-secondary font-semibold">{note.author.encryptionStatus}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>동기화 상태</span>
                        <span className="text-primary font-medium">실시간 동기화 완료</span>
                      </div>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
    </WorkspaceLayout>
  );
};
