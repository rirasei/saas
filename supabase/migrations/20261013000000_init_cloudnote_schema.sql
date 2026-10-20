-- ==============================================================================
-- CloudNote (클라우드노트) Supabase 초기 데이터베이스 마이그레이션 & RLS 정책
-- ==============================================================================

-- 1. 확장 기능 활성화 (UUID 및 암호화 지원)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. 공통 유틸리티 함수 (updated_at 자동 갱신)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 3. public."user" 테이블 생성 (auth.users와 1:1 동기화)
-- ==============================================================================
-- [요구사항] public 스키마에 user 테이블을 만들고 auth.users 생성 시 동기화
-- PostgreSQL 예약어 충돌 방지 및 명확성을 위해 "user"로 생성
CREATE TABLE IF NOT EXISTS public."user" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 4. 워크스페이스 (workspaces) 및 멤버십 (workspace_members) 테이블
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  storage_used_bytes BIGINT DEFAULT 1503238553 NOT NULL, -- 기본 사용량 약 1.4GB
  storage_limit_bytes BIGINT DEFAULT 16106127360 NOT NULL, -- 기본 15GB
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')) DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (workspace_id, user_id)
);

-- ==============================================================================
-- 5. 카테고리 폴더 (folders) 및 태그 (tags)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'folder_open' NOT NULL,
  color TEXT,
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hex TEXT DEFAULT '#004ac6' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (workspace_id, name)
);

-- ==============================================================================
-- 6. 노트 문서 (notes) 및 연관 태그 (note_tags)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  last_edited_by_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '제목 없는 노트',
  icon_emoji TEXT DEFAULT '🚀',
  cover_image_url TEXT,
  sprint TEXT,
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'NONE')) DEFAULT 'NONE',
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'ARCHIVED', 'TRASHED')) DEFAULT 'ACTIVE',
  sync_version TEXT DEFAULT 'rev-88402f',
  word_count INT DEFAULT 0 NOT NULL,
  reading_time_minutes INT DEFAULT 1 NOT NULL,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.note_tags (
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- ==============================================================================
-- 7. 블록 에디터 단위 (note_blocks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.note_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'HEADING_1', 'HEADING_2', 'HEADING_3',
    'PARAGRAPH', 'CHECKLIST', 'CODE',
    'CALLOUT_AI', 'TABLE', 'DIVIDER', 'QUOTE'
  )),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 8. 활동 이력 타임라인 (activity_logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'EDITED', 'COMMENTED', 'SYNCED', 'VIEWED')),
  version TEXT,
  comment_count INT DEFAULT 0 NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 9. 구독 (subscriptions) 및 결제 트랜잭션 (payment_transactions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('STARTER', 'PRO', 'TEAM', 'ENTERPRISE')) DEFAULT 'PRO',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')) DEFAULT 'YEARLY',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING')) DEFAULT 'TRIALING',
  ai_credit_limit INT DEFAULT 500 NOT NULL,
  ai_credit_used INT DEFAULT 0 NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now() NOT NULL,
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '14 days') NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL, -- 공급가액
  vat NUMERIC(12, 2) NOT NULL,    -- 부가가치세 10%
  discount_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL, -- 최종 결제금액
  currency TEXT DEFAULT 'KRW' NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('CARD', 'EASY_PAY', 'BANK_TRANSFER')) DEFAULT 'CARD',
  card_provider TEXT,
  card_number_masked TEXT,
  installment_months INT DEFAULT 0 NOT NULL,
  receipt_url TEXT,
  paid_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'REFUNDED')) DEFAULT 'SUCCESS',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 10. 인덱스 최적화 (성능 및 쿼리 최적화)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_folders_workspace ON public.folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_workspace ON public.tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace ON public.notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON public.notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_author ON public.notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(workspace_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_note_blocks_note ON public.note_blocks(note_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ws ON public.activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ws ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON public.payment_transactions(order_number);

-- ==============================================================================
-- 11. 자동 updated_at 갱신 트리거 등록
-- ==============================================================================
CREATE OR REPLACE TRIGGER tr_user_updated_at BEFORE UPDATE ON public."user"
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER tr_workspaces_updated_at BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER tr_folders_updated_at BEFORE UPDATE ON public.folders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER tr_notes_updated_at BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER tr_note_blocks_updated_at BEFORE UPDATE ON public.note_blocks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER tr_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. auth.users ↔ public."user" 동기화 & 온보딩 초기 데이터 트리거 함수
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_ws_id UUID;
  user_display_name TEXT;
  folder_plan_id UUID;
  folder_arch_id UUID;
  folder_book_id UUID;
  folder_meet_id UUID;
  tag_plan_id UUID;
  tag_sprint_id UUID;
  tag_arch_id UUID;
  tag_ui_id UUID;
  sample_note_id UUID;
BEGIN
  -- 1) 사용자 표시 이름 결정
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- 2) public."user" 테이블에 동기화 삽입
  INSERT INTO public."user" (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public."user".name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public."user".avatar_url),
    updated_at = now();

  -- 3) 사용자 기본 워크스페이스 자동 생성
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    user_display_name || '의 워크스페이스',
    'ws-' || substr(NEW.id::text, 1, 8) || '-' || to_char(now(), 'MMDDHH24MI'),
    NEW.id
  )
  RETURNING id INTO default_ws_id;

  -- 4) 워크스페이스 소유자(OWNER) 멤버십 추가
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (default_ws_id, NEW.id, 'OWNER');

  -- 5) 14일 무료 체험(TRIALING) Pro 구독 자동 활성화
  INSERT INTO public.subscriptions (
    workspace_id, user_id, plan, billing_cycle, status,
    ai_credit_limit, ai_credit_used, trial_ends_at, current_period_end
  )
  VALUES (
    default_ws_id,
    NEW.id,
    'PRO',
    'YEARLY',
    'TRIALING',
    500,
    0,
    now() + interval '14 days',
    now() + interval '14 days'
  );

  -- 6) 초기 기본 카테고리 폴더 4종 생성 (design/dashboard.html 기반)
  INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
  VALUES (default_ws_id, '제품 기획', '로드맵, PRD, 기능 명세', 'lightbulb', 1)
  RETURNING id INTO folder_plan_id;

  INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
  VALUES (default_ws_id, '개발 아키텍처', 'API 명세, 인프라 구성', 'terminal', 2)
  RETURNING id INTO folder_arch_id;

  INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
  VALUES (default_ws_id, '개인 독서노트', '독후감, 북마크, 서평', 'menu_book', 3)
  RETURNING id INTO folder_book_id;

  INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
  VALUES (default_ws_id, '회의록 & 미팅', '위클리 싱크, 스프린트 회고', 'forum', 4)
  RETURNING id INTO folder_meet_id;

  -- 7) 초기 태그 생성
  INSERT INTO public.tags (workspace_id, name, color_hex)
  VALUES (default_ws_id, '기획', '#004ac6')
  RETURNING id INTO tag_plan_id;

  INSERT INTO public.tags (workspace_id, name, color_hex)
  VALUES (default_ws_id, '스프린트', '#006a61')
  RETURNING id INTO tag_sprint_id;

  INSERT INTO public.tags (workspace_id, name, color_hex)
  VALUES (default_ws_id, '아키텍처', '#943700')
  RETURNING id INTO tag_arch_id;

  INSERT INTO public.tags (workspace_id, name, color_hex)
  VALUES (default_ws_id, 'UI/UX', '#2563eb')
  RETURNING id INTO tag_ui_id;

  -- 8) 온보딩 샘플 노트 생성 (design/note.html 목업 본문 대응)
  INSERT INTO public.notes (
    workspace_id, folder_id, author_id, last_edited_by_id,
    title, icon_emoji, sprint, priority, is_pinned, status,
    sync_version, word_count, reading_time_minutes,
    ai_summary
  )
  VALUES (
    default_ws_id,
    folder_plan_id,
    NEW.id,
    NEW.id,
    '2026 Q4 SaaS 신규 기능 로드맵 및 클라우드 동기화 아키텍처',
    '🚀',
    'Sprint 26.4',
    'P0',
    true,
    'ACTIVE',
    'rev-88402f',
    842,
    3,
    '이번 릴리즈는 오프라인 퍼스트(Offline-First) 동기화 및 실시간 다중 커서 협업 엔진(CRDT 기반) 구축이 핵심 목표입니다.'
  )
  RETURNING id INTO sample_note_id;

  -- 노트 태그 연결
  INSERT INTO public.note_tags (note_id, tag_id)
  VALUES (sample_note_id, tag_plan_id), (sample_note_id, tag_sprint_id);

  -- 샘플 블록 추가
  INSERT INTO public.note_blocks (note_id, type, sort_order, content)
  VALUES
    (sample_note_id, 'CALLOUT_AI', 1, jsonb_build_object(
      'title', 'AI 자동 요약 및 주요 목표',
      'text', '이번 릴리즈는 오프라인 퍼스트(Offline-First) 동기화 및 실시간 다중 커서 협업 엔진(CRDT 기반) 구축이 핵심 목표입니다.'
    )),
    (sample_note_id, 'HEADING_1', 2, jsonb_build_object(
      'text', '1. 핵심 아키텍처 개편 개요'
    )),
    (sample_note_id, 'PARAGRAPH', 3, jsonb_build_object(
      'text', '기존 WebSocket 폴백 체계를 개선하여 WebRTC 데이터 채널을 병행 지원합니다. 클라이언트 측 상태 영속성을 보장하기 위해 SQLite WASM 로컬 복제본을 유지합니다.'
    )),
    (sample_note_id, 'CHECKLIST', 4, jsonb_build_object(
      'text', 'CRDT 상태 충돌 해결 알고리즘 벤치마크 및 PoC 완료 (담당: 인프라팀)',
      'is_completed', true
    )),
    (sample_note_id, 'CHECKLIST', 5, jsonb_build_object(
      'text', 'IndexedDB 기반 캐시 계층에서 SQLite WASM 엔진으로 전환',
      'is_completed', true
    )),
    (sample_note_id, 'CHECKLIST', 6, jsonb_build_object(
      'text', '다중 사용자 세션 가상 커서 렌더링 및 레이턴시 보정 레이어 구현 (PR #402 리뷰 대기)',
      'is_completed', false
    ));

  -- 초기 활동 로그 기록
  INSERT INTO public.activity_logs (workspace_id, note_id, user_id, action, version, metadata)
  VALUES (
    default_ws_id,
    sample_note_id,
    NEW.id,
    'CREATED',
    'v1.0.0',
    jsonb_build_object('message', '워크스페이스 및 온보딩 템플릿 생성 완료')
  );

  RETURN NEW;
END;
$$;

-- auth.users INSERT 시 자동 발동하는 트리거 설정
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- auth.users UPDATE 시 public."user" 동기화 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_update_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public."user"
  SET
    email = NEW.email,
    name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      public."user".name
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      public."user".avatar_url
    ),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_auth_user();

-- ==============================================================================
-- 13. RLS 헬퍼 함수 (보안 및 성능 최적화: SECURITY DEFINER)
-- ==============================================================================
-- 워크스페이스 멤버십 여부 판별 함수
CREATE OR REPLACE FUNCTION public.is_workspace_member(lookup_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = lookup_workspace_id AND user_id = auth.uid()
  );
$$;

-- 워크스페이스 관리자 이상 (OWNER or ADMIN) 권한 판별 함수
CREATE OR REPLACE FUNCTION public.is_workspace_admin(lookup_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = lookup_workspace_id
      AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
  );
$$;

-- ==============================================================================
-- 14. Row Level Security (RLS) 정책 활성화 및 설정
-- ==============================================================================

-- 14.1 public."user" 테이블 RLS
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 회원 프로필(아바타, 이름) 열람 가능 (협업자 표시용)
CREATE POLICY "Users can view all public profiles"
  ON public."user" FOR SELECT
  TO authenticated
  USING (true);

-- 사용자는 본인 프로필만 직접 수정 가능
CREATE POLICY "Users can update their own profile"
  ON public."user" FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 14.2 workspaces 테이블 RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(id));

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace admins can update workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (public.is_workspace_admin(id))
  WITH CHECK (public.is_workspace_admin(id));

CREATE POLICY "Workspace owner can delete workspace"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 14.3 workspace_members 테이블 RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view members in their workspace"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can add new members or user can join as self"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_admin(workspace_id) OR
    (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id))
  );

CREATE POLICY "Admins can update member roles"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can remove members or member can leave"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (public.is_workspace_admin(workspace_id) OR user_id = auth.uid());

-- 14.4 folders 테이블 RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view folders"
  ON public.folders FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage folders"
  ON public.folders FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 14.5 tags 및 note_tags 테이블 RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view note tags"
  ON public.note_tags FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_tags.note_id AND public.is_workspace_member(notes.workspace_id)
  ));

CREATE POLICY "Members can manage note tags"
  ON public.note_tags FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_tags.note_id AND public.is_workspace_member(notes.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_tags.note_id AND public.is_workspace_member(notes.workspace_id)
  ));

-- 14.6 notes 테이블 RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id) AND
    author_id = auth.uid()
  );

CREATE POLICY "Workspace members can update notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Author or Admin can delete notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id) AND
    (author_id = auth.uid() OR public.is_workspace_admin(workspace_id))
  );

-- 14.7 note_blocks 테이블 RLS
ALTER TABLE public.note_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view note blocks"
  ON public.note_blocks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_blocks.note_id AND public.is_workspace_member(notes.workspace_id)
  ));

CREATE POLICY "Workspace members can manage note blocks"
  ON public.note_blocks FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_blocks.note_id AND public.is_workspace_member(notes.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_blocks.note_id AND public.is_workspace_member(notes.workspace_id)
  ));

-- 14.8 activity_logs 테이블 RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id) AND
    user_id = auth.uid()
  );

-- 14.9 subscriptions 테이블 RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

-- 14.10 payment_transactions 테이블 RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and admins can view payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "Users can insert their own payment transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.is_workspace_member(workspace_id)
  );

-- ==============================================================================
-- 완료 알림
-- ==============================================================================
COMMENT ON TABLE public."user" IS '사용자 계정 정보 (auth.users와 자동 동기화)';
COMMENT ON TABLE public.workspaces IS '워크스페이스 기본 정보 및 스토리지 할당량';
COMMENT ON TABLE public.workspace_members IS '워크스페이스 멤버 및 역할 (OWNER/ADMIN/MEMBER/VIEWER)';
COMMENT ON TABLE public.notes IS '메모 문서 메타데이터 및 상태';
COMMENT ON TABLE public.note_blocks IS '블록 에디터 단위 콘텐츠 데이터';
COMMENT ON TABLE public.subscriptions IS '워크스페이스 요금제 플랜 및 구독 상태';
COMMENT ON TABLE public.payment_transactions IS '전자 결제 영수증 및 결제 승인 내역';
