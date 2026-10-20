import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/src/shared/types/database.types';
import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail, NoteChecklistItem } from '../../domain/models/NoteDetail';
import { NoteSummary } from '../../domain/models/NoteSummary';

export class SupabaseNoteRepository implements INoteRepository {
  private readonly supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  async getNoteById(noteId: string, userId: string): Promise<NoteDetail | null> {
    // 1. Fetch user name for author display
    type UserRow = Database['public']['Tables']['user']['Row'];
    let userProfile: UserRow | null = null;
    let authMetaName: string | undefined;

    try {
      const { createAdminClient } = await import('@/src/shared/lib/supabase/admin');
      const admin = typeof window === 'undefined' && process.env.NODE_ENV !== 'test'
        ? createAdminClient()
        : this.supabase;
      const { data } = await admin
        .from('user')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      userProfile = data as UserRow | null;
    } catch {
      const { data } = await this.supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      userProfile = data as UserRow | null;
    }

    try {
      const { data: authData } = await this.supabase.auth.getUser();
      authMetaName =
        authData?.user?.user_metadata?.full_name ||
        authData?.user?.user_metadata?.name;
    } catch {
      // ignore
    }

    const userName = (userProfile as UserRow | null)?.name || authMetaName || '사용자';

    if (noteId === 'new') {
      return {
        id: 'new',
        workspaceId: 'default',
        title: '2026 Q4 SaaS 신규 기능 로드맵 및 클라우드 동기화 아키텍처',
        folderName: '제품 기획',
        iconEmoji: '🚀',
        coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS2wjicWauQKqdUknrtNIHbIN4tOWu53eb0OkrfNIruKm07DqKssiSnwW5oG7XhGHM-ld_auNzXdTE-RKb3XJIsilEvpkv5b5AxPF0-IvtOcpEqnlSysf1uOY03WGWkZneK_pvV4rV0dRdn9hjB35bAk3l-LcdHFr7Ggp8TzxImLMy37K0tNBDSxpZsE2l8hRQWz7aTWUdlCKQzRMAvzpnsF8DPaIVWUPMhnvag97w07EA8oalGWjSJA',
        sprintBadge: 'Sprint 26.4',
        priorityBadge: '우선순위: P0',
        tags: ['#제품기획', '#로드맵', '#v2.4-sync'],
        isPinned: true,
        wordCount: 842,
        readingTimeMinutes: 3,
        syncStatusText: '방금 전 자동 저장됨',
        aiSummary: {
          title: 'AI 자동 요약 및 주요 목표',
          description: '이번 릴리즈는 오프라인 퍼스트(Offline-First) 동기화 및 실시간 다중 커서 협업 엔진(CRDT 기반) 구축이 핵심 목표입니다.',
          badgeText: '클라우드엔진 v4 기준 분석',
        },
        checklists: [
          { id: 'c1', text: 'SQLite WASM 로컬 캐시 레이어 구현 및 0.1s 멱등성 큐 검증', isCompleted: true, metadataText: '2026.10.15 완료 배포' },
          { id: 'c2', text: 'CRDT Yjs 멀티플레이어 충돌 해결 프로토콜 부하 테스트 (1,000 CCU)', isCompleted: true, metadataText: '2026.10.18 배포 완료' },
          { id: 'c3', text: 'AI 지능형 3줄 요약 백엔드 서버리스 파이프라인 연동', isCompleted: false, metadataText: 'Review 중 • PR #142' },
        ],
        codeSnippet: {
          filename: 'SyncCoordinator.ts',
          code: `interface SyncQueueItem {\n  id: string;\n  operation: 'INSERT' | 'UPDATE' | 'DELETE';\n  documentId: string;\n  payload: CRDTMessage;\n  timestamp: number;\n}\n\nexport class OfflineSyncManager {\n  private localDb: SQLiteDatabase;\n  async flushToCloud(): Promise<SyncResult> {\n    const queue = await this.localDb.getPendingQueue();\n    return await relayService.pushIncrementalChanges(queue);\n  }\n}`,
        },
        author: {
          name: userName,
          versionHash: 'rev-88402f',
          encryptionStatus: 'AES-256 GCM',
        },
      };
    }

    // Try querying real note from Supabase
    const { data: noteRow } = (await this.supabase
      .from('notes')
      .select('*, folders(*), note_blocks(*)')
      .eq('id', noteId)
      .single()) as unknown as {
        data: (Database['public']['Tables']['notes']['Row'] & {
          folders: Database['public']['Tables']['folders']['Row'] | null;
          note_blocks: Database['public']['Tables']['note_blocks']['Row'][];
        }) | null;
      };

    if (noteRow) {
      const checklists: NoteChecklistItem[] = (noteRow.note_blocks || [])
        .filter((b) => b.type === 'CHECKLIST')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((b) => {
          const content = b.content as Record<string, string | boolean> | null;
          return {
            id: b.id,
            text: (content?.text as string) || '새 할 일 항목',
            isCompleted: b.is_completed ?? false,
            metadataText: (content?.metadataText as string) || undefined,
          };
        });

      return {
        id: noteRow.id,
        workspaceId: noteRow.workspace_id,
        title: noteRow.title,
        folderName: noteRow.folders?.name || '제품 기획',
        iconEmoji: noteRow.icon_emoji || '🚀',
        coverImageUrl: noteRow.cover_image_url || undefined,
        sprintBadge: noteRow.sprint || 'Sprint 26.4',
        priorityBadge: `우선순위: ${noteRow.priority}`,
        tags: ['#제품기획', '#로드맵', '#v2.4-sync'],
        isPinned: noteRow.is_pinned,
        wordCount: noteRow.word_count || 842,
        readingTimeMinutes: noteRow.reading_time_minutes || 3,
        syncStatusText: '방금 전 자동 저장됨',
        aiSummary: {
          title: 'AI 자동 요약 및 주요 목표',
          description: noteRow.ai_summary || '이번 릴리즈는 오프라인 퍼스트(Offline-First) 동기화 및 실시간 다중 커서 협업 엔진(CRDT 기반) 구축이 핵심 목표입니다.',
          badgeText: '클라우드엔진 v4 기준 분석',
        },
        checklists: checklists.length > 0 ? checklists : [
          { id: 'c1', text: 'SQLite WASM 로컬 캐시 레이어 구현 및 0.1s 멱등성 큐 검증', isCompleted: true, metadataText: '2026.10.15 완료 배포' },
          { id: 'c2', text: 'CRDT Yjs 멀티플레이어 충돌 해결 프로토콜 부하 테스트 (1,000 CCU)', isCompleted: true, metadataText: '2026.10.18 배포 완료' },
          { id: 'c3', text: 'AI 지능형 3줄 요약 백엔드 서버리스 파이프라인 연동', isCompleted: false, metadataText: 'Review 중 • PR #142' },
        ],
        codeSnippet: {
          filename: 'SyncCoordinator.ts',
          code: `interface SyncQueueItem {\n  id: string;\n  operation: 'INSERT' | 'UPDATE' | 'DELETE';\n  documentId: string;\n  payload: CRDTMessage;\n  timestamp: number;\n}\n\nexport class OfflineSyncManager {\n  private localDb: SQLiteDatabase;\n  async flushToCloud(): Promise<SyncResult> {\n    const queue = await this.localDb.getPendingQueue();\n    return await relayService.pushIncrementalChanges(queue);\n  }\n}`,
        },
        author: {
          name: userName,
          versionHash: noteRow.sync_version || 'rev-88402f',
          encryptionStatus: 'AES-256 GCM',
        },
      };
    }

    // Default fallback to starter roadmap note
    return {
      id: noteId,
      workspaceId: 'default',
      title: '2026 Q4 SaaS 신규 기능 로드맵 및 클라우드 동기화 아키텍처',
      folderName: '제품 기획',
      iconEmoji: '🚀',
      coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS2wjicWauQKqdUknrtNIHbIN4tOWu53eb0OkrfNIruKm07DqKssiSnwW5oG7XhGHM-ld_auNzXdTE-RKb3XJIsilEvpkv5b5AxPF0-IvtOcpEqnlSysf1uOY03WGWkZneK_pvV4rV0dRdn9hjB35bAk3l-LcdHFr7Ggp8TzxImLMy37K0tNBDSxpZsE2l8hRQWz7aTWUdlCKQzRMAvzpnsF8DPaIVWUPMhnvag97w07EA8oalGWjSJA',
      sprintBadge: 'Sprint 26.4',
      priorityBadge: '우선순위: P0',
      tags: ['#제품기획', '#로드맵', '#v2.4-sync'],
      isPinned: true,
      wordCount: 842,
      readingTimeMinutes: 3,
      syncStatusText: '방금 전 자동 저장됨',
      aiSummary: {
        title: 'AI 자동 요약 및 주요 목표',
        description: '이번 릴리즈는 오프라인 퍼스트(Offline-First) 동기화 및 실시간 다중 커서 협업 엔진(CRDT 기반) 구축이 핵심 목표입니다.',
        badgeText: '클라우드엔진 v4 기준 분석',
      },
      checklists: [
        { id: 'c1', text: 'SQLite WASM 로컬 캐시 레이어 구현 및 0.1s 멱등성 큐 검증', isCompleted: true, metadataText: '2026.10.15 완료 배포' },
        { id: 'c2', text: 'CRDT Yjs 멀티플레이어 충돌 해결 프로토콜 부하 테스트 (1,000 CCU)', isCompleted: true, metadataText: '2026.10.18 배포 완료' },
        { id: 'c3', text: 'AI 지능형 3줄 요약 백엔드 서버리스 파이프라인 연동', isCompleted: false, metadataText: 'Review 중 • PR #142' },
      ],
      codeSnippet: {
        filename: 'SyncCoordinator.ts',
        code: `interface SyncQueueItem {\n  id: string;\n  operation: 'INSERT' | 'UPDATE' | 'DELETE';\n  documentId: string;\n  payload: CRDTMessage;\n  timestamp: number;\n}\n\nexport class OfflineSyncManager {\n  private localDb: SQLiteDatabase;\n  async flushToCloud(): Promise<SyncResult> {\n    const queue = await this.localDb.getPendingQueue();\n    return await relayService.pushIncrementalChanges(queue);\n  }\n}`,
      },
      author: {
        name: userName,
        versionHash: 'rev-88402f',
        encryptionStatus: 'AES-256 GCM',
      },
    };
  }

  async saveNoteTitle(noteId: string, title: string): Promise<void> {
    await (this.supabase.from('notes') as unknown as {
      update: (values: { title: string; updated_at: string }) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', noteId);
  }

  async toggleChecklist(blockId: string, isCompleted: boolean): Promise<void> {
    await (this.supabase.from('note_blocks') as unknown as {
      update: (values: { is_completed: boolean; updated_at: string }) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({ is_completed: isCompleted, updated_at: new Date().toISOString() })
      .eq('id', blockId);
  }

  async getNotes(userId: string): Promise<NoteSummary[]> {
    const { data: rows } = (await this.supabase
      .from('notes')
      .select('*, folders(name)')
      .eq('author_id', userId)
      .order('updated_at', { ascending: false })) as unknown as {
        data: Array<Database['public']['Tables']['notes']['Row'] & {
          folders: { name: string } | null;
        }> | null;
      };

    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        folderName: r.folders?.name || '제품 기획',
        iconEmoji: r.icon_emoji || '📝',
        tags: ['#기획', '#로드맵'],
        priority: r.priority,
        isPinned: r.is_pinned,
        status: r.status,
        updatedAt: '방금 전',
        wordCount: r.word_count || 500,
      }));
    }

    // Default starter notes if user has no saved notes yet
    return [
      {
        id: 'new',
        title: '2026 Q4 SaaS 신규 기능 로드맵 및 클라우드 동기화 아키텍처',
        folderName: '제품 기획',
        iconEmoji: '🚀',
        tags: ['#제품기획', '#로드맵', '#v2.4-sync'],
        priority: 'P0',
        isPinned: true,
        status: 'ACTIVE',
        updatedAt: '10분 전',
        wordCount: 842,
      },
      {
        id: 'note-sample-2',
        title: 'GraphQL API 엔드포인트 캐싱 및 실시간 Pub/Sub 설계서',
        folderName: '개발 아키텍처',
        iconEmoji: '⚡',
        tags: ['#인프라', '#API'],
        priority: 'P1',
        isPinned: false,
        status: 'ACTIVE',
        updatedAt: '42분 전',
        wordCount: 1204,
      },
      {
        id: 'note-sample-3',
        title: 'Q3 스프린트 회고 및 엔지니어링 온보딩 개선안',
        folderName: '회의록 & 미팅',
        iconEmoji: '📋',
        tags: ['#회고', '#엔지니어링'],
        priority: 'P2',
        isPinned: false,
        status: 'ACTIVE',
        updatedAt: '2시간 전',
        wordCount: 620,
      },
    ];
  }

  async deleteNote(noteId: string): Promise<void> {
    await (this.supabase.from('notes') as unknown as {
      delete: () => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .delete()
      .eq('id', noteId);
  }

  async togglePin(noteId: string, isPinned: boolean): Promise<void> {
    await (this.supabase.from('notes') as unknown as {
      update: (values: { is_pinned: boolean; updated_at: string }) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
      .eq('id', noteId);
  }

  async createNote(data: {
    userId: string;
    workspaceId?: string;
    title: string;
    folderId?: string;
    folderName?: string;
  }): Promise<NoteDetail> {
    let workspaceId = data.workspaceId;
    if (!workspaceId) {
      const { data: wsMember } = (await this.supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', data.userId)
        .limit(1)
        .maybeSingle()) as unknown as { data: { workspace_id: string } | null };
      workspaceId = wsMember?.workspace_id || 'b888c638-2b9b-412a-b9f1-f410afe2d257';
    }

    let folderId = data.folderId;
    if (!folderId) {
      const { data: folder } = (await this.supabase
        .from('folders')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle()) as unknown as { data: { id: string } | null };
      folderId = folder?.id;
    }

    const { data: newNote } = (await (this.supabase.from('notes') as unknown as {
      insert: (values: Record<string, unknown>) => {
        select: () => {
          single: () => Promise<{ data: Database['public']['Tables']['notes']['Row'] | null }>;
        };
      };
    })
      .insert({
        workspace_id: workspaceId,
        folder_id: folderId || null,
        author_id: data.userId,
        last_edited_by_id: data.userId,
        title: data.title,
        icon_emoji: '📝',
        status: 'ACTIVE',
        priority: 'P0',
        is_pinned: false,
        word_count: 120,
        reading_time_minutes: 1,
        ai_summary: '새로 생성된 메모입니다. 지능형 요약 및 체크리스트를 추가해 보세요.',
      })
      .select()
      .single()) as { data: Database['public']['Tables']['notes']['Row'] | null };

    const noteId = newNote?.id || 'note-' + Date.now();

    return {
      id: noteId,
      workspaceId,
      title: data.title,
      folderName: data.folderName || '제품 기획',
      iconEmoji: '📝',
      tags: ['#기획'],
      isPinned: false,
      wordCount: 120,
      readingTimeMinutes: 1,
      syncStatusText: '방금 전 자동 저장됨',
      aiSummary: {
        title: '새 메모 생성 완료',
        description: '새로 생성된 메모입니다. 지능형 요약 및 체크리스트를 추가해 보세요.',
        badgeText: '신규 생성',
      },
      checklists: [
        { id: 'c1', text: '문서 핵심 목표 및 세부 요구사항 작성', isCompleted: false },
        { id: 'c2', text: '팀원 검토 및 코멘트 취합', isCompleted: false },
      ],
      author: {
        name: '사용자',
        versionHash: 'rev-init',
        encryptionStatus: 'AES-256 GCM',
      },
    };
  }
}
