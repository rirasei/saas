---
trigger: always_on
---

# E-Commerce 프로젝트 클린 아키텍처(Clean Architecture) 가이드

본 문서는 Next.js 16 (App Router) + React 19 + TypeScript 기반의 이커머스 프로젝트에서 클린 아키텍처를 도입하기 위한 아키텍처 원칙, 계층 구조, 권장 폴더 구조 및 코드 작성 표준을 설명합니다.

---

## 1. 아키텍처 핵심 원칙

1. **의존성 규칙 (The Dependency Rule)**
   - 외부 계층(`Presentation`, `Infrastructure`)은 내부 계층(`Application`, `Domain`)을 참조할 수 있지만, **내부 계층은 외부 계층의 세부 구현(Next.js, React, UI 라이브러리, HTTP 클라이언트 등)을 절대 참조하지 않습니다.**
2. **Next.js `app/` 디렉터리의 역할 (Thin Entry Point & Composition Root)**
   - `app/` 디렉터리는 오직 **라우팅, 레이아웃 조립, 의존성 주입(Composition Root)** 역할만 수행합니다. 비즈니스 로직과 복잡한 계산이 `app/`에 직접 작성되지 않도록 합니다.
3. **도메인 중심 수직 슬라이스 (Feature/Domain-First Architecture)**
   - 계층을 기준으로 전체 프로젝트를 나누기보다, 이커머스의 핵심 도메인(`product`, `order`, `customer`, `sales`, `auth` 등) 단위로 슬라이스를 나누고 그 내부에 클린 아키텍처 계층을 둡니다.

---

## 2. 전체 디렉터리 구조

```text
ecommerce/
├── app/                                    # [Next.js App Router] 라우팅 및 의존성 조립 (Composition Root)
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── sales/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   └── layout.tsx
│
├── src/
│   ├── shared/                             # [공통 모듈] 도메인에 종속되지 않는 공용 자원
│   │   ├── components/                     # 재사용 가능한 UI 컴포넌트 (Button, Modal, Input 등)
│   │   ├── config/                         # 앱 전역 설정, 환경 변수
│   │   ├── lib/                            # HTTP 클라이언트(fetch/axios 래퍼), 포맷터, 유틸
│   │   └── types/                          # 공통 타입 및 인터페이스
│   │
│   └── features/                           # [도메인 모듈] 각 비즈니스 영역별 클린 아키텍처 슬라이스
│       ├── product/                        # 상품 도메인
│       │   ├── domain/                     # 1. 엔티티, 인터페이스, 순수 비즈니스 규칙 (Pure TS)
│       │   │   ├── models/                 #    - Product.ts, Stock.ts
│       │   │   └── repositories/           #    - ProductRepository.interface.ts
│       │   ├── application/                # 2. 유스케이스 (업무 흐름 조율)
│       │   │   ├── use-cases/              #    - GetProductsUseCase.ts, CreateProductUseCase.ts
│       │   │   └── dtos/                   #    - CreateProductDto.ts
│       │   ├── infrastructure/             # 3. 외부 시스템 연동 (API, 캐시, DB)
│       │   │   ├── repositories/           #    - ApiProductRepository.ts (IProductRepository 구현체)
│       │   │   └── mappers/                #    - ProductMapper.ts (API 응답 ↔ Domain Model 변환)
│       │   └── presentation/               # 4. 화면 표현 계층 (UI, Hook, Server Action)
│       │       ├── components/             #    - ProductTable.tsx, ProductForm.tsx
│       │       ├── hooks/                  #    - useProductList.ts
│       │       └── actions/                #    - product.server-actions.ts (Next.js Server Actions)
│       │
│       ├── order/                          # 주문 도메인 (동일 계층 구조)
│       ├── customer/                       # 고객 도메인 (동일 계층 구조)
│       ├── sales/                          # 매출/통계 도메인 (동일 계층 구조)
│       └── auth/                           # 인증/인가 도메인 (동일 계층 구조)
│
├── design/                                 # 화면 기획 및 UI 디자인 레퍼런스
├── public/                                 # 정적 에셋
├── tsconfig.json                           # TypeScript 설정 (경로 별칭 정의)
└── package.json
```

---

## 3. 4대 계층별 역할 및 책임

| 계층 (Layer) | 위치 | 책임 및 규칙 | 허용되는 의존성 |
| :--- | :--- | :--- | :--- |
| **1. Domain** | `features/*/domain` | • 엔티티(Entity), 값 객체(Value Object), 비즈니스 유효성 검증<br>• Repository 인터페이스 정의 | **외부 의존성 없음 (순수 TypeScript)** |
| **2. Application** | `features/*/application` | • 유스케이스(Use Case): 단일 비즈니스 행위 실행 및 조율<br>• DTO(Data Transfer Object) 정의 | **Domain 계층만 의존** |
| **3. Infrastructure**| `features/*/infrastructure`| • Repository 구현체 (HTTP API, DB, LocalStorage, 쿠키 등)<br>• Mapper: 외부 데이터 모델과 도메인 모델 간 변환 | **Domain, Application, 외부 라이브러리** |
| **4. Presentation**  | `features/*/presentation`<br>+ `app/` | • React UI 컴포넌트, 상태 관리 훅(Custom Hook)<br>• Server Actions 및 App Router 페이지 | **Application, Domain, UI 라이브러리** |

---

## 4. 실제 코드 구현 흐름 (Product 도메인 예시)

### Step 1. Domain 계층 (`Product.ts` & `ProductRepository.interface.ts`)
```typescript
// src/features/product/domain/models/Product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DRAFT';
  createdAt: Date;
}

// src/features/product/domain/repositories/ProductRepository.interface.ts
import { Product } from '../models/Product';

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product>;
}
```

### Step 2. Application 계층 (`GetProductsUseCase.ts`)
```typescript
// src/features/product/application/use-cases/GetProductsUseCase.ts
import { IProductRepository } from '../../domain/repositories/ProductRepository.interface';
import { Product } from '../../domain/models/Product';

export class GetProductsUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(): Promise<Product[]> {
    // 필요 시 비즈니스 정렬/필터링 로직 추가
    return await this.productRepo.findAll();
  }
}
```

### Step 3. Infrastructure 계층 (`ApiProductRepository.ts`)
```typescript
// src/features/product/infrastructure/repositories/ApiProductRepository.ts
import { IProductRepository } from '../../domain/repositories/ProductRepository.interface';
import { Product } from '../../domain/models/Product';

export class ApiProductRepository implements IProductRepository {
  async findAll(): Promise<Product[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('상품 목록을 불러오는 데 실패했습니다.');
    
    const data = await res.json();
    return data.map((item: any): Product => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      stock: Number(item.stock),
      status: item.status,
      createdAt: new Date(item.created_at),
    }));
  }

  async findById(id: string): Promise<Product | null> {
    // 구현 생략
    return null;
  }

  async create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    // 구현 생략
    throw new Error('Not implemented');
  }
}
```

### Step 4. Presentation & Routing (`app/(dashboard)/products/page.tsx`)
```tsx
// app/(dashboard)/products/page.tsx (Next.js Server Component)
import { ApiProductRepository } from '@/src/features/product/infrastructure/repositories/ApiProductRepository';
import { GetProductsUseCase } from '@/src/features/product/application/use-cases/GetProductsUseCase';
import { ProductTable } from '@/src/features/product/presentation/components/ProductTable';

export default async function ProductsPage() {
  // 의존성 주입 (DI)
  const productRepository = new ApiProductRepository();
  const getProductsUseCase = new GetProductsUseCase(productRepository);
  const products = await getProductsUseCase.execute();

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">상품 관리</h1>
      <ProductTable products={products} />
    </div>
  );
}
```

---

## 5. `tsconfig.json` 권장 경로 별칭 (Path Alias)

모듈 간 import 경로를 직관적이고 깔끔하게 유지하기 위해 `tsconfig.json` 설정을 다음과 같이 확장하는 것을 권장합니다.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

---

## 6. 실무 도입 전략 (Pragmatic Guidelines)

1. **점진적 도입 (복잡도에 따른 차등 적용)**
   - 결제/주문(`order`), 할인/정산(`sales`)과 같이 비즈니스 규칙이 복잡한 핵심 도메인은 Use Case와 Domain Model을 엄격하게 적용합니다.
   - 단순 조회 위주의 설정 페이지(`settings`) 등은 Use Case를 생략하고 Presentation에서 직접 Repository를 호출하는 형태로 실용성을 챙깁니다.
2. **Server Actions 연계**
   - Next.js Server Actions는 `features/*/presentation/actions/`에 위치시키고, Server Action 내부에서 Use Case를 호출하도록 감싸서 클라이언트와 서버 간 데이터 처리를 캡슐화합니다.
