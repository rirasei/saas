'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NoteSummary } from '../../domain/models/NoteSummary';
import { WorkspaceLayout, Badge, TagChip, SearchInput } from '@/src/shared/components';
import { deleteNoteAction, toggleNotePinAction } from '../actions/note.server-actions';
import { resetSubscriptionForTestingAction } from '@/src/features/subscription/presentation/actions/payment.server-actions';

interface NotesListViewProps {
  initialNotes: NoteSummary[];
  hasPermission?: boolean;
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export const NotesListView: React.FC<NotesListViewProps> = ({ initialNotes, hasPermission = false, user }) => {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteSummary[]>(initialNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('전체');
  const [selectedTag, setSelectedTag] = useState<string>('#전체');
  const [selectedPriority, setSelectedPriority] = useState<string>('전체');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Extract unique folders and tags
  const folders = useMemo(() => {
    const list = Array.from(new Set(notes.map((n) => n.folderName))).filter(Boolean);
    return ['전체', ...list];
  }, [notes]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tagSet.add(t)));
    return ['#전체', ...Array.from(tagSet)];
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        n.folderName.toLowerCase().includes(searchQuery.toLowerCase());

      // Folder
      const matchesFolder = selectedFolder === '전체' || n.folderName === selectedFolder;

      // Tag
      const matchesTag =
        selectedTag === '#전체' ||
        n.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      // Priority
      const matchesPriority =
        selectedPriority === '전체' || n.priority === selectedPriority;

      return matchesSearch && matchesFolder && matchesTag && matchesPriority;
    });
  }, [notes, searchQuery, selectedFolder, selectedTag, selectedPriority]);

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    if (!hasPermission) {
      alert('결제가 완료된 회원만 노트를 수정할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
      return;
    }

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !currentPinned } : n))
    );
    try {
      await toggleNotePinAction(noteId, !currentPinned);
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  };

  const handleDelete = async (noteId: string, title: string) => {
    if (!hasPermission) {
      alert('결제가 완료된 회원만 노트를 삭제할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
      return;
    }

    if (!confirm(`'${title}' 노트를 삭제하시겠습니까?`)) return;

    // Optimistic update
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      await deleteNoteAction(noteId);
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  };

  const handleNoteNavigation = (e: React.MouseEvent, href: string) => {
    if (!hasPermission) {
      e.preventDefault();
      alert('결제가 완료된 회원만 노트를 조회할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
    }
  };

  const handleNewNoteClick = (e: React.MouseEvent) => {
    if (!hasPermission) {
      e.preventDefault();
      alert('결제가 완료된 회원만 새 노트를 생성할 수 있습니다. 요금제 결제를 완료해 주세요.');
      router.push('/pricing');
    }
  };

  const handleResetSubscription = async () => {
    if (confirm('테스트를 위해 구독 상태를 미결제(TRIALING) 상태로 초기화하시겠습니까?')) {
      await resetSubscriptionForTestingAction();
      window.location.reload();
    }
  };

  const pinnedCount = notes.filter((n) => n.isPinned).length;
  const totalWords = notes.reduce((sum, n) => sum + (n.wordCount || 0), 0);

  return (
    <WorkspaceLayout user={user}>
      <div className="relative pt-16 w-full min-h-screen bg-surface">
        <div className="flex flex-col w-full px-8 py-8 pb-24 max-w-7xl mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-outline-variant/15">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="primary">
                  <span>노트 아카이브</span>
                  <span className="mx-1">•</span>
                  <span>전체 {notes.length}개</span>
                </Badge>
                {hasPermission ? (
                  <Badge variant="secondary">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    <span className="font-semibold">토스페이먼츠 결제 완료 (Pro 플랜)</span>
                  </Badge>
                ) : (
                  <Badge variant="neutral">
                    <span className="material-symbols-outlined text-xs text-error">lock</span>
                    <span className="text-error font-semibold">미결제 상태 (권한 제한됨)</span>
                  </Badge>
                )}
                {pinnedCount > 0 && (
                  <Badge variant="neutral">
                    <span>중요 고정 {pinnedCount}개</span>
                  </Badge>
                )}
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                노트 관리
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                워크스페이스의 모든 노트를 검색, 필터링, 분류 및 관리하세요.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/notes/new"
                onClick={handleNewNoteClick}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-label-md text-label-md shadow-md transition-all active:scale-[0.98] ${
                  hasPermission
                    ? 'bg-primary text-on-primary hover:shadow-lg hover:bg-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {hasPermission ? 'add' : 'lock'}
                </span>
                <span className="font-semibold">+ 새 노트 작성</span>
              </Link>
            </div>
          </div>

          {/* Payment Status Alert / Paywall Hero Card */}
          {!hasPermission ? (
            <div className="mt-6 p-6 rounded-3xl bg-surface-container-lowest border border-error/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center text-2xl shrink-0">
                  <span className="material-symbols-outlined text-2xl text-error">lock</span>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-error-container/40 text-error font-label-sm text-label-sm font-semibold mb-1">
                    <span>토스페이먼츠 결제 필요 • 권한 잠김</span>
                  </div>
                  <h2 className="font-title text-title font-bold text-on-surface">
                    노트 생성, 수정, 삭제, 조회를 위해 토스페이먼츠 결제를 완료해 주세요
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                    현재 무료 체험 또는 미결제 상태로 노트의 생성, 수정, 삭제, 조회가 제한됩니다.
                    토스페이먼츠 안전 결제를 통해 Pro 플랜을 구독하시면 모든 권한이 즉시 부여됩니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <Link
                  href="/pricing"
                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-md text-center inline-flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">credit_card</span>
                  <span>토스페이먼츠로 플랜 결제하기</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 rounded-2xl bg-secondary-container/20 border border-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl">verified</span>
                <div>
                  <span className="font-label-md text-label-md font-bold text-on-surface block">
                    토스페이먼츠 정기 구독 활성화됨 (Pro 플랜)
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    노트 생성, 수정, 삭제, 조회의 모든 권한이 정상적으로 활성화되었습니다.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetSubscription}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
                title="결제 권한 플로우 재테스트를 위해 구독 상태를 미결제 상태로 초기화합니다"
              >
                결제 상태 재설정(테스트용)
              </button>
            </div>
          )}

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  전체 노트
                </span>
                <div className="font-headline-md text-headline-md font-bold text-on-surface mt-0.5">
                  {notes.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">article</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  즐겨찾는 고정
                </span>
                <div className="font-headline-md text-headline-md font-bold text-tertiary mt-0.5">
                  {pinnedCount}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-tertiary">
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  카테고리 폴더
                </span>
                <div className="font-headline-md text-headline-md font-bold text-secondary mt-0.5">
                  {folders.length - 1}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-xl">folder_open</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  총 작성 단어
                </span>
                <div className="font-headline-md text-headline-md font-bold text-on-surface mt-0.5">
                  {totalWords.toLocaleString()}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-xl">format_shapes</span>
              </div>
            </div>
          </div>

          {/* Search & Filters Controls */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex-1 max-w-lg">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="노트 제목, 태그, 폴더 검색 (⌘K)"
                />
              </div>

              {/* View Switch & Priority Filter */}
              <div className="flex items-center gap-3">
                {/* Priority Selector */}
                <div className="flex items-center gap-1.5 bg-surface-container-high px-2 py-1 rounded-xl text-on-surface font-label-sm text-label-sm">
                  <span className="text-on-surface-variant text-xs pl-1">우선순위:</span>
                  {(['전체', 'P0', 'P1', 'P2'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPriority(p)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedPriority === p
                          ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-surface-container-high p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="그리드 보기"
                  >
                    <span className="material-symbols-outlined text-lg">grid_view</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'table'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="테이블 목록 보기"
                  >
                    <span className="material-symbols-outlined text-lg">view_list</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Folder & Tag Chips */}
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 mr-1">
                  폴더:
                </span>
                {folders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFolder(f)}
                    className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                      selectedFolder === f
                        ? 'bg-primary text-on-primary font-semibold shadow-xs'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {f === '전체' ? '📁 전체 폴더' : `📁 ${f}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 mr-1">
                  태그:
                </span>
                {allTags.map((tag) => (
                  <TagChip
                    key={tag}
                    tag={tag}
                    selected={selectedTag === tag}
                    onClick={() => setSelectedTag(tag)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mt-6 mb-3 text-on-surface-variant font-label-sm text-label-sm">
            <span>
              검색 결과 <span className="text-primary font-semibold">{filteredNotes.length}</span>개
              {searchQuery && ` (검색어: "${searchQuery}")`}
            </span>
            {(searchQuery ||
              selectedFolder !== '전체' ||
              selectedTag !== '#전체' ||
              selectedPriority !== '전체') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFolder('전체');
                  setSelectedTag('#전체');
                  setSelectedPriority('전체');
                }}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                필터 초기화
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredNotes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-3xl">search_off</span>
              </div>
              <h3 className="font-title text-title text-on-surface font-semibold">
                일치하는 노트가 없습니다
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                검색어를 변경하거나 필터를 초기화해 보세요. 새 아이디어가 있다면 지금 바로 노트를
                작성해 보세요.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFolder('전체');
                    setSelectedTag('#전체');
                    setSelectedPriority('전체');
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-md text-label-md text-on-surface transition-colors"
                >
                  필터 초기화
                </button>
                <Link
                  href="/notes/new"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-xs"
                >
                  + 새 노트 작성
                </Link>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <article
                  key={note.id}
                  className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Meta Bar */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-label-sm text-label-sm">
                          📁 {note.folderName}
                        </span>
                        {note.priority !== 'NONE' && (
                          <span
                            className={`px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold ${
                              note.priority === 'P0'
                                ? 'bg-error-container/40 text-error'
                                : note.priority === 'P1'
                                ? 'bg-secondary-fixed/40 text-secondary'
                                : 'bg-surface-container text-outline'
                            }`}
                          >
                            {note.priority}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id, note.isPinned)}
                        aria-label="고정 토글"
                        className={`p-1 rounded-lg transition-transform hover:scale-110 ${
                          note.isPinned
                            ? 'text-tertiary'
                            : 'text-outline-variant hover:text-tertiary'
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

                    {/* Note Title with Icon */}
                    <Link
                      href={`/notes/${note.id}`}
                      onClick={(e) => handleNoteNavigation(e, `/notes/${note.id}`)}
                      className="block group-hover:text-primary transition-colors"
                    >
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl shrink-0">{note.iconEmoji || '📝'}</span>
                        <h3 className="font-title text-title text-on-surface font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {note.title}
                        </h3>
                      </div>
                    </Link>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {note.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-label-sm text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 pt-3 border-t border-outline-variant/10 flex items-center justify-between text-outline-variant">
                    <div className="flex items-center gap-3 font-label-sm text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {note.updatedAt}
                      </span>
                      <span>•</span>
                      <span>{note.wordCount || 0}단어</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/notes/${note.id}`}
                        onClick={(e) => handleNoteNavigation(e, `/notes/${note.id}`)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        title="편집하기"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id, note.title)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                        title="삭제"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xs overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="bg-surface-container-low/70 text-on-surface-variant font-label-sm text-label-sm">
                    <th className="py-3 px-4 rounded-l-xl font-semibold">노트 제목</th>
                    <th className="py-3 px-4 font-semibold">폴더</th>
                    <th className="py-3 px-4 font-semibold">우선순위</th>
                    <th className="py-3 px-4 font-semibold">태그</th>
                    <th className="py-3 px-4 font-semibold">단어 수</th>
                    <th className="py-3 px-4 font-semibold">수정 시간</th>
                    <th className="py-3 px-4 rounded-r-xl text-right font-semibold">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-surface-container-low/50 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(note.id, note.isPinned)}
                            className={note.isPinned ? 'text-tertiary' : 'text-outline-variant hover:text-tertiary'}
                            aria-label="고정"
                          >
                            <span
                              className="material-symbols-outlined text-base"
                              style={note.isPinned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                              star
                            </span>
                          </button>
                          <span className="text-lg">{note.iconEmoji || '📝'}</span>
                          <Link
                            href={`/notes/${note.id}`}
                            onClick={(e) => handleNoteNavigation(e, `/notes/${note.id}`)}
                            className="font-title text-title text-on-surface font-medium group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
                          >
                            {note.title}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-label-sm text-label-sm">
                          📁 {note.folderName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold ${
                            note.priority === 'P0'
                              ? 'bg-error-container/40 text-error'
                              : note.priority === 'P1'
                              ? 'bg-secondary-fixed/40 text-secondary'
                              : 'bg-surface-container text-outline'
                          }`}
                        >
                          {note.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {note.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-xs"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-code text-xs">
                        {note.wordCount || 0}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant text-xs">
                        {note.updatedAt}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/notes/${note.id}`}
                            onClick={(e) => handleNoteNavigation(e, `/notes/${note.id}`)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                            title="편집"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id, note.title)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                            title="삭제"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
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
    </WorkspaceLayout>
  );
};
