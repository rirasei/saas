# 기술 스택 표준 및 규칙 (Tech Stack & Integration Rules)

본 문서는 **Next.js 16 (App Router) + React 19 + TypeScript + Supabase + Tailwind CSS v4** 환경에서 프로젝트의 기술 스택을 구성하고 연동할 때 준수해야 하는 표준 규칙입니다.

---

## 1. 핵심 기술 스택 구성

| 분류 | 기술 | 버전 / 규격 | 용도 및 책임 |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | 16.x (App Router) | 풀스택 웹 프레임워크, 서버 컴포넌트, 서버 액션 |
| **UI Library** | React | 19.x | 선언적 UI, 최신 동시성 훅(`useActionState`, `useOptimistic`) |
| **Language** | TypeScript | 5.x (Strict Mode) | 엄격한 정적 타입 정의 |
| **BaaS / DB** | Supabase | PostgreSQL / Auth / Storage | 인증, 실시간 데이터베이스, 파일 스토리지 |
| **SSR Auth** | `@supabase/ssr` | 최신 | App Router 쿠키 기반 세션 동기화 및 클라이언트 분리 |
| **Styling** | Tailwind CSS | v4 | 유틸리티 퍼스트 CSS, 테마 토큰 기반 스타일링 |

---

## 2. Supabase 연동 표준 규칙

### 2.1. 인스턴스 분리 원칙 (`@supabase/ssr`)
Next.js App Router 환경에서는 실행 환경(서버/브라우저)에 따라 Supabase 클라이언트를 반드시 분리해야 합니다.

1. **Browser Client (브라우저 환경)**:
   - 위치: `src/shared/lib/supabase/client.ts`
   - 인터랙티브한 Client Component(`'use client'`)에서 사용.
   ```typescript
   // src/shared/lib/supabase/client.ts
   import { createBrowserClient } from '@supabase/ssr';
   import { Database } from '@/src/shared/types/database.types';

   export function createClient() {
     return createBrowserClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
     );
   }
   ```

2. **Server Client (서버 환경)**:
   - 위치: `src/shared/lib/supabase/server.ts`
   - Server Component, Server Actions, Route Handlers에서 쿠키(`next/headers`)와 함께 사용.
   ```typescript
   // src/shared/lib/supabase/server.ts
   import { createServerClient } from '@supabase/ssr';
   import { cookies } from 'next/headers';
   import { Database } from '@/src/shared/types/database.types';

   export async function createClient() {
     const cookieStore = await cookies();

     return createServerClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll();
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options)
               );
             } catch {
               // Server Component 내에서 호출 시 무시 (미들웨어에서 갱신 처리)
             }
           },
         },
       }
     );
   }
   ```

3. **Middleware 세션 갱신 (`middleware.ts`)**:
   - 루트의 `middleware.ts`에서 Supabase Auth 토큰 갱신 및 인증 보호 라우트(대시보드 등) 가드 처리.

---

## 3. 클린 아키텍처와의 결합 규칙 (Clean Architecture Integration)

1. **Infrastructure 계층으로의 철저한 격리**:
   - `createClient()`나 `supabase.from(...)` 호출을 UI 컴포넌트나 Use Case에서 직접 호출하지 않습니다.
   - 오직 **`features/*/infrastructure/repositories/`** 내부의 Repository 구현체에서만 Supabase 쿼리를 실행합니다.
   ```text
   UI / Server Component
      ↓
   Application (Use Case)
      ↓
   Domain (IProductRepository Interface)
      ↑ [구현/DIP]
   Infrastructure (SupabaseProductRepository)  ← [Supabase 클라이언트 호출]
   ```

2. **Database Types와 Domain Entity 간 Mapper 분리**:
   - Supabase 테이블 행(Row) 타입과 프론트엔드 비즈니스 모델(Domain Entity)을 직접 결합하지 않습니다.
   - `features/*/infrastructure/mappers/`를 통해 DB 스네이크 케이스 컬럼(`created_at`, `order_status`)을 카멜 케이스 도메인 객체(`createdAt`, `orderStatus`)로 변환합니다.

---

## 4. 환경 변수 및 보안 표준 (Security & Env Rules)

1. **환경 변수 파일 관리**:
   - 정적 에셋 폴더인 `public/`에 `.env` 파일을 두지 않으며, **프로젝트 루트의 `.env.local`**에서 관리합니다.
   - Git 저장소에 커밋되지 않도록 `.gitignore`에 등록합니다.
2. **키 분리 및 RLS 준수**:
   - `NEXT_PUBLIC_SUPABASE_URL`: 프로젝트 API URL (공개 가능)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (또는 `ANON_KEY`): 클라이언트용 공개 키 (공개 가능, RLS 통제 필수)
   - `SUPABASE_SERVICE_ROLE_KEY`: 관리자 전용 시크릿 키 (절대 `NEXT_PUBLIC_` 접두사 금지, 백엔드/서버 전용)
   - 모든 Supabase 테이블은 반드시 **RLS(Row Level Security)** 정책을 활성화하여 비인가 접근을 원천 차단합니다.

---

## 5. React 19 & Tailwind CSS v4 개발 규칙

1. **React 19 최신 훅 적극 활용**:
   - 폼 제출 및 서버 액션 상태 처리 시 불필요한 서드파티 라이브러리 대신 `useActionState`, `useOptimistic`을 우선 활용합니다.
2. **Tailwind CSS v4 테마 및 스타일링**:
   - 임의의 매직 넘버 스타일 대신 테마 토큰과 표준 유틸리티 클래스를 사용합니다.
   - 어드민 대시보드 UI의 일관성을 위해 폰트, 컬러 팔레트, 라운딩 값은 일관된 규칙으로 구성합니다.

---

### 6. 마이그레이션 (Migrations)
- `supabase/migrations` 폴더에 위치
- 마이그레이션을 수정하거나 삭제하거나 새로 생성할 때는 항상 사용자의 허가 받기.
