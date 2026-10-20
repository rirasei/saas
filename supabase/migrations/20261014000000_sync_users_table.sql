-- Create public.users view pointing to public."user" so that Table Editor displays both
CREATE OR REPLACE VIEW public.users AS
SELECT id, email, name, avatar_url, created_at, updated_at
FROM public."user";

-- Fix handle_new_auth_user trigger with bulletproof error-safe onboarding
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
  tag_plan_id UUID;
  tag_sprint_id UUID;
  sample_note_id UUID;
BEGIN
  -- 1) 사용자 표시 이름 결정
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- 2) public."user" 테이블에 동기화 삽입 (반드시 성공해야 함)
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

  -- 3) 기본 워크스페이스 및 온보딩 템플릿 생성 (예외 발생 시에도 유저 생성은 보장)
  BEGIN
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
      user_display_name || '의 워크스페이스',
      'ws-' || substr(NEW.id::text, 1, 8) || '-' || substr(md5(random()::text), 1, 6),
      NEW.id
    )
    RETURNING id INTO default_ws_id;

    -- 워크스페이스 소유자(OWNER) 멤버십 추가
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (default_ws_id, NEW.id, 'OWNER');

    -- 14일 무료 체험(TRIALING) Pro 구독 자동 활성화
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

    -- 기본 카테고리 폴더 4종 생성
    INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
    VALUES (default_ws_id, '제품 기획', '로드맵, PRD, 기능 명세', 'lightbulb', 1)
    RETURNING id INTO folder_plan_id;

    INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
    VALUES (default_ws_id, '개발 아키텍처', 'API 명세, 인프라 구성', 'terminal', 2);

    INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
    VALUES (default_ws_id, '개인 독서노트', '독후감, 북마크, 서평', 'menu_book', 3);

    INSERT INTO public.folders (workspace_id, name, description, icon_name, sort_order)
    VALUES (default_ws_id, '회의록 & 미팅', '위클리 싱크, 스프린트 회고', 'forum', 4);

    -- 기본 태그 생성
    INSERT INTO public.tags (workspace_id, name, color_hex)
    VALUES (default_ws_id, '기획', '#004ac6')
    RETURNING id INTO tag_plan_id;

    INSERT INTO public.tags (workspace_id, name, color_hex)
    VALUES (default_ws_id, '스프린트', '#006a61')
    RETURNING id INTO tag_sprint_id;

    INSERT INTO public.tags (workspace_id, name, color_hex)
    VALUES (default_ws_id, '아키텍처', '#943700');

    INSERT INTO public.tags (workspace_id, name, color_hex)
    VALUES (default_ws_id, 'UI/UX', '#2563eb');

    -- 온보딩 샘플 노트 생성
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

    -- 태그 연결
    IF sample_note_id IS NOT NULL AND tag_plan_id IS NOT NULL AND tag_sprint_id IS NOT NULL THEN
      INSERT INTO public.note_tags (note_id, tag_id)
      VALUES (sample_note_id, tag_plan_id), (sample_note_id, tag_sprint_id);
    END IF;

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
      ));

    -- 활동 로그 기록
    INSERT INTO public.activity_logs (workspace_id, note_id, user_id, action, version, metadata)
    VALUES (
      default_ws_id,
      sample_note_id,
      NEW.id,
      'CREATED',
      'v1.0.0',
      jsonb_build_object('message', '워크스페이스 및 온보딩 템플릿 생성 완료')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Onboarding provisioning error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 트리거 재등록
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
