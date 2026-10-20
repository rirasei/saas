# Next.js 프레임워크 개발 규칙 (Next.js Framework Rules)

본 문서는 **Next.js 16 (App Router) + React 19 + TypeScript** 환경에서 프로젝트의 유지보수성, 성능, 가독성을 극대화하기 위해 Antigravity 및 개발자가 반드시 준수해야 하는 프레임워크 규칙입니다.

---

## 1. 핵심 3대 원칙 (Core Principles)

### 1.1. Server Component 최우선 (Default to Server Components)
- **기본값은 Server Component**: 모든 컴포넌트(`page.tsx`, `layout.tsx`, 공통 UI)는 기본적으로 Server Component로 작성합니다.
- **`'use client'`는 최하단(Leaf)으로 격리**:
  - `useState`, `useEffect`, 브라우저 이벤트 핸들러(onClick, onChange), 브라우저 API가 필요한 경우에만 최소 단위 컴포넌트에 `'use client'`를 선언합니다.
  - 최상위 페이지나 레이아웃에 `'use client'`를 선언하지 않습니다. 상위는 데이터를 fetch하는 Server Component로 두고, 인터랙션이 필요한 UI만 하위 Client Component로 감싸 주입합니다.

### 1.2. 간결하고 명확한 코드 작성 (Simplicity & Readability)
- **자기 설명적 네이밍 (Self-Explanatory)**: 함수와 변수명은 주석 없이도 역할을 알 수 있도록 명확하게 짓습니다.
- **조기 반환 (Early Return)**: 복잡한 중첩 `if/else` 대신 가드 절(Guard Clauses)과 조기 반환을 사용해 코드 들여쓰기 깊이를 최소화합니다.
- **선언적 렌더링**: 조건부 렌더링 시 삼항 연산자가 중첩되거나 복잡해지면 별도의 서브 컴포넌트로 추출합니다.

### 1.3. 파일 크기 제한 및 단일 책임 분리 (File Decomposition)
- **파일당 최대 줄 수 권장 (150 ~ 200줄 이내)**: 단일 파일이 200줄을 초과하기 시작하면 즉시 분리 검토 대상입니다.
- **단일 책임 원칙 (SRP)**:
  - 컴포넌트 파일에는 UI 표현 로직만 둡니다.
  - 복잡한 상태 로직 → Custom Hook (`hooks/use*.ts`)으로 분리
  - 복잡한 비즈니스 계산 및 데이터 변환 → 유틸/도메인 함수 (`lib/` 또는 `domain/`)로 분리
  - 거대한 단일 뷰 → 서브 컴포넌트(`components/*.tsx`)로 쪼개어 합성(Composition)

---

## 2. 추가 권장 프레임워크 룰 (Recommended Best Practices)

### 2.1. Next.js 15/16 비동기 Page Props 처리 규칙
- Next.js 최신 버전에서는 `params`와 `searchParams`가 **`Promise`**로 제공됩니다.
- 페이지 컴포넌트 및 `generateMetadata`에서 반드시 `await`로 언래핑하여 사용합니다.
```tsx
// ✅ 올바른 패턴 (Next.js 15/16)
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page } = await searchParams;
  return <div>주문 ID: {id}</div>;
}
```

### 2.2. 데이터 변경(Mutation)은 Server Actions 사용
- 데이터 생성/수정/삭제는 API Route 대신 **Server Actions**를 우선 사용합니다.
- Server Actions는 `features/*/presentation/actions/` 또는 `app/actions/`에 위치시키고 최상단에 `'use server'`를 명시합니다.
- 폼 입력값이나 파라미터는 실행 전 반드시 TypeScript 타입 검증 또는 검증 라이브러리(Zod)를 통해 안전성을 확보합니다.

### 2.3. 스트리밍 렌더링 및 에러 바운더리 표준화
- 데이터 페칭이 지연되는 구간은 페이지 전체를 멈추지 않고, **`Suspense`**와 스켈레톤 UI를 활용해 점진적 렌더링(Streaming)을 구현합니다.
- 경로 세그먼트마다 `loading.tsx`와 `error.tsx`를 배치하여 예측 가능한 로딩/에러 화면을 제공합니다. (`error.tsx`는 Client Component여야 함)

### 2.4. 환경 변수 및 보안 규칙 (Environment Security)
- **파일 위치 주의**: 환경 변수 파일(`.env`, `.env.local`)은 정적으로 웹에 서빙되는 `public/` 디렉터리에 두지 않고 **프로젝트 루트**에 둡니다.
- **클라이언트 노출 격리**:
  - 브라우저에 노출되어야 하는 값만 `NEXT_PUBLIC_` 접두사를 사용합니다.
  - Supabase Service Role Key, PG 결제 시크릿, API 인증 토큰 등은 절대 `NEXT_PUBLIC_`을 붙이지 않고 서버 환경(Server Component, Server Action, API Route)에서만 사용합니다.

### 2.5. 이미지 및 에셋 최적화
- 일반 `<img>` 태그 사용을 지양하고, **`next/image` (`<Image />`)**를 필수로 사용합니다.
- `width`, `height` 또는 `fill`을 명시하여 레이아웃 이동(CLS: Cumulative Layout Shift)을 원천 차단합니다.

### 2.6. 엄격한 타입 시스템 (Strict TypeScript)
- `any` 타입 사용을 절대 금지합니다.
- API 응답, 컴포넌트 Props, 이벤트 핸들러 파라미터에 명시적인 인터페이스/타입을 선언합니다.

---

## 3. DO & DON'T 빠른 가이드

| 구분 | DO (권장) | DON'T (금지) |
| :--- | :--- | :--- |
| **렌더링** | 기본 Server Component 사용, 말단에만 `'use client'` | `page.tsx` 최상단에 습관적으로 `'use client'` 선언 |
| **데이터 페칭** | Server Component 내에서 직접 `async/await` 페칭 | 불필요하게 `useEffect` + `fetch`로 클라이언트 페칭 |
| **파일 구조** | 150줄 초과 시 컴포넌트 및 Hook으로 분리 | 300~500줄 이상의 거대한 단일 컴포넌트 방치 |
| **라우트 핸들러** | Server Action 활용 및 `revalidatePath`로 캐시 무효화 | 단순 데이터 갱신을 위해 불필요한 REST API 라우트 남발 |
| **환경 변수** | 루트의 `.env.local` 관리, 시크릿 키는 서버 전용으로 은닉 | `public/.env`에 시크릿 키 보관 또는 클라이언트에 유출 |
| **타입** | 구체적인 Interface/Type 정의 및 Props 명시 | `any` 사용 또는 인라인 타입 난립 |
