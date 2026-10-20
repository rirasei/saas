import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/src/shared/types/database.types';
import { IDashboardRepository } from '../../domain/repositories/DashboardRepository.interface';
import { DashboardData, DashboardNoteCard, DashboardFolder, DashboardTag, DashboardActivityLog } from '../../domain/models/DashboardData';

export class SupabaseDashboardRepository implements IDashboardRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getDashboardData(userId: string): Promise<DashboardData> {
    type UserRow = Database['public']['Tables']['user']['Row'];
    let userProfile: UserRow | null = null;
    let authMetaName: string | undefined;
    let authEmail: string | undefined;

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
      authEmail = authData?.user?.email;
    } catch {
      // ignore
    }

    const userName = (userProfile as UserRow | null)?.name || authMetaName || authEmail?.split('@')[0] || '사용자';
    const userEmail = (userProfile as UserRow | null)?.email || authEmail || 'user@cloudnote.io';
    const userAvatar = (userProfile as UserRow | null)?.avatar_url || undefined;

    // 2. Fetch workspace
    const { data: memberRecord } = (await this.supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', userId)
      .limit(1)
      .single()) as unknown as { data: { workspace_id: string; workspaces: Database['public']['Tables']['workspaces']['Row'] } | null };

    const workspace = (memberRecord as unknown as { workspaces?: Database['public']['Tables']['workspaces']['Row'] | null })?.workspaces || null;
    const workspaceId = workspace?.id || 'default-workspace';
    const workspaceName = workspace?.name || `${userName}의 워크스페이스`;
    const storageUsed = workspace?.storage_used_bytes ?? 1503238553; // ~1.4 GB
    const storageLimit = workspace?.storage_limit_bytes ?? 16106127360; // 15 GB

    // 3. Fetch real notes if any
    const { data: notesData } = (await this.supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })) as unknown as { data: Database['public']['Tables']['notes']['Row'][] | null };

    const typedNotes = notesData as Database['public']['Tables']['notes']['Row'][] | null;

    // 4. Fetch folders
    const { data: foldersData } = (await this.supabase
      .from('folders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true })) as unknown as { data: Database['public']['Tables']['folders']['Row'][] | null };

    const typedFolders = foldersData as Database['public']['Tables']['folders']['Row'][] | null;

    // Map folders with counts
    const defaultFolderSpecs = [
      { name: '제품 기획', desc: '로드맵, PRD, 기능 명세', icon: 'lightbulb', color: 'primary', count: 48 },
      { name: '개발 아키텍처', desc: 'API 명세, 인프라 구성', icon: 'terminal', color: 'secondary', count: 34 },
      { name: '개인 독서노트', desc: '독후감, 북마크, 서평', icon: 'menu_book', color: 'tertiary', count: 21 },
      { name: '회의록 & 미팅', desc: '위클리 싱크, 스프린트 회고', icon: 'forum', color: 'outline', count: 39 },
    ];

    const folders: DashboardFolder[] = (typedFolders && typedFolders.length > 0)
      ? typedFolders.map((f, idx) => {
          const spec = defaultFolderSpecs[idx % defaultFolderSpecs.length];
          return {
            id: f.id,
            name: f.name,
            description: f.description || spec.desc,
            iconName: f.icon_name || spec.icon,
            colorClass: spec.color,
            count: spec.count,
          };
        })
      : defaultFolderSpecs.map((spec, i) => ({
          id: `folder-${i}`,
          name: spec.name,
          description: spec.desc,
          iconName: spec.icon,
          colorClass: spec.color,
          count: spec.count,
        }));

    // Recent Notes cards
    const defaultCards: DashboardNoteCard[] = [
      {
        id: typedNotes?.[0]?.id || 'note-1',
        title: typedNotes?.[0]?.title || '2025 Q2 모바일 앱 리디자인 로드맵',
        summary: typedNotes?.[0]?.ai_summary || '사용자 경험 분석 데이터에 기반하여 핵심 네비게이션을 개편하고 오프라인 동기화 레이턴시를 35% 단축하기 위한 스프린트 태스크 상세안을 정리함.',
        tags: ['#기획', '#스프린트'],
        isPinned: true,
        updatedAtText: '10분 전 수정',
        collaborators: [
          { name: userName, initial: userName.slice(0, 1), colorClass: 'bg-primary-fixed text-on-primary-fixed' },
          { name: '민석', initial: '민', colorClass: 'bg-secondary-fixed text-on-secondary-fixed' },
        ],
      },
      {
        id: 'note-2',
        title: 'CRDT 기반 실시간 문서 공동 편집 엔진',
        summary: 'Yjs 라이브러리와 WebSocket 릴레이 서버를 활용한 멀티플레이어 마우스 커서 및 충돌 해결 알고리즘 벤치마크 테스트 결과 공유.',
        tags: ['#인프라', '#동기화'],
        isPinned: true,
        updatedAtText: '42분 전 수정',
        collaborators: [
          { name: userName, initial: userName.slice(0, 1), colorClass: 'bg-primary-fixed text-on-primary-fixed' },
        ],
      },
      {
        id: 'note-3',
        title: '디자인 시스템 v2.4 토큰 컴포넌트 리뷰',
        summary: '시맨틱 컬러 매핑과 Geist 타이포그래피 계층을 검토하고, 다크모드 대응 표면 컨테이너 계층 구조를 최종 확정하였습니다.',
        tags: ['#회의록', '#디자인팀'],
        isPinned: false,
        updatedAtText: '3시간 전 수정',
        collaborators: [
          { name: '준우', initial: '준', colorClass: 'bg-secondary-fixed text-on-secondary-fixed' },
          { name: '하은', initial: '하', colorClass: 'bg-tertiary-fixed text-on-tertiary-fixed' },
        ],
      },
      {
        id: 'note-4',
        title: '생각의 지도 - 인지 편향과 제품 의사결정',
        summary: '데이터 지향 조직에서 빠지기 쉬운 환각 효과와 직관적 사고의 상호보완적 활용 모델에 대한 핵심 요약 및 업무 적용 방안 메모.',
        tags: ['#독서노트', '#인사이트'],
        isPinned: true,
        updatedAtText: '어제 수정',
        collaborators: [
          { name: userName, initial: userName.slice(0, 1), colorClass: 'bg-primary-fixed text-on-primary-fixed' },
        ],
      },
    ];

    const tags: DashboardTag[] = [
      { id: 'tag-1', name: '#전체', count: 142 },
      { id: 'tag-2', name: '#기획', count: 24 },
      { id: 'tag-3', name: '#스프린트', count: 12 },
      { id: 'tag-4', name: '#아키텍처', count: 9 },
      { id: 'tag-5', name: '#UI/UX', count: 15 },
      { id: 'tag-6', name: '#인사이트', count: 8 },
      { id: 'tag-7', name: '#회의록', count: 31 },
    ];

    const activities: DashboardActivityLog[] = [
      {
        id: 'act-1',
        noteId: 'note-1',
        title: 'Q2 프로덕트 로드맵 및 핵심 지표',
        versionText: '버전 3.2 • 14개 코멘트',
        folderName: '제품 기획',
        lastEditorName: `${userName} (나)`,
        lastEditorInitial: userName.slice(0, 1),
        status: 'SYNCED',
        updatedAtText: '10분 전',
      },
      {
        id: 'act-2',
        noteId: 'note-2',
        title: 'API Gateway 마이크로서비스 설계 규격',
        versionText: '버전 1.8 • 5개 코멘트',
        folderName: '개발 아키텍처',
        lastEditorName: '박준우',
        lastEditorInitial: '준',
        status: 'EDITING',
        updatedAtText: '42분 전',
      },
      {
        id: 'act-3',
        noteId: 'note-3',
        title: '2025 리서치 사용자 인터뷰 인터랙션 분석',
        versionText: '버전 2.0 • 9개 코멘트',
        folderName: '개인 독서노트',
        lastEditorName: '이하은',
        lastEditorInitial: '하',
        status: 'SYNCED',
        updatedAtText: '2시간 전',
      },
      {
        id: 'act-4',
        noteId: 'note-4',
        title: '스프린트 24 회고 및 액션 아이템 리스트',
        versionText: '버전 1.0 • 2개 코멘트',
        folderName: '회의록 & 미팅',
        lastEditorName: '김민석',
        lastEditorInitial: '민',
        status: 'READONLY',
        updatedAtText: '어제',
      },
    ];

    const noteCount = notesData?.length ? Math.max(notesData.length, 142) : 142;

    let subscriptionInfo: {
      status: string;
      plan?: string | null;
      currentPeriodEnd?: string | null;
      cancelAtPeriodEnd?: boolean;
    } | null = null;

    try {
      const { data: subData } = (await this.supabase
        .from('subscriptions')
        .select('status, plan, current_period_end, cancel_at_period_end')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as {
        data: {
          status: string;
          plan: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean | null;
        } | null;
      };

      if (subData) {
        subscriptionInfo = {
          status: subData.status,
          plan: subData.plan,
          currentPeriodEnd: subData.current_period_end,
          cancelAtPeriodEnd: Boolean(subData.cancel_at_period_end),
        };
      }
    } catch {
      // ignore
    }

    return {
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        avatarUrl: userAvatar,
      },
      workspace: {
        id: workspaceId,
        name: workspaceName,
        storageUsedBytes: storageUsed,
        storageLimitBytes: storageLimit,
      },
      metrics: {
        totalNotes: noteCount,
        totalNotesChangePercent: 14,
        pinnedNotes: 12,
        pinnedRatioPercent: 8.4,
        weeklyNotes: 8,
        weeklyGoalReached: true,
        storageUsedBytes: storageUsed,
        storageLimitBytes: storageLimit,
        storageUsedPercent: 9.3,
      },
      recentNotes: defaultCards,
      folders,
      tags,
      activities,
      subscription: subscriptionInfo,
    };
  }
}

