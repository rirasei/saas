# CloudNote 테스트 매트릭스 및 도메인 규칙 참조표

본 문서는 CloudNote SaaS 프로젝트의 21개 테스트 스위트 및 65개 세부 단위 테스트의 검증 대상과 핵심 비즈니스 규칙을 정리한 레퍼런스입니다.

---

## 1. 테스트 스위트 전체 목록 (21 Suites, 65 Tests)

| 도메인 슬라이스 | 테스트 파일 경로 | 검증 핵심 비즈니스 로직 |
| :--- | :--- | :--- |
| **Subscription** | `ActivateSubscriptionUseCase.test.ts` | 결제 완료 응답(Toss)을 수신하여 구독을 ACTIVE로 활성화하고 플랜(PRO/TEAM, MONTHLY/ANNUAL) 분기 |
| **Subscription** | `CancelSubscriptionUseCase.test.ts` | 구독 해지 시 상태 갱신 및 등록된 빌링키/빌링 정보 삭제 |
| **Subscription** | `ChargeRecurringBillingUseCase.test.ts` | 저장된 빌링키로 결제 승인 API 호출 및 구독 기간 30일 연장 |
| **Subscription** | `CheckNotePermissionUseCase.test.ts` | 결제 완료(ACTIVE) 여부에 따른 메모 권한(생성/조회/수정/삭제) 제한 및 CANCELED 시 잔여 기간 유예 확인 |
| **Subscription** | `ConfirmPaymentUseCase.test.ts` | Toss Payments 결제 승인 API 및 금액 위변조 검증 |
| **Subscription** | `CreatePendingPaymentUseCase.test.ts` | 결제창 호출 전 위변조 방지를 위한 PENDING 결제 레코드 선행 생성 |
| **Subscription** | `GetUserSubscriptionDetailsUseCase.test.ts` | 유저의 구독 상태, 플랜 정보, 거래 결제 내역 조회 |
| **Subscription** | `IssueAndActivateBillingUseCase.test.ts` | 빌링키 발급 및 30일 주기 설정, 첫 회 결제 승인 동시 처리 |
| **Subscription** | `ProcessTodayDueBillingsUseCase.test.ts` | 당일 결제 도래 빌링키 일괄 배치 결제 및 실패 복원력 집계 |
| **Subscription** | `RecordPaymentStateUseCase.test.ts` | 결제 취소/실패/성공 상태 기록 및 유저 구독 연동 |
| **Subscription** | `RefundPaymentUseCase.test.ts` | 주문 번호 기반 결제 취소 및 환불 처리 |
| **Subscription** | `BillingRepository.test.ts` | 당일 결제 도래(due) 빌링키 DB 필터링 쿼리 로직 |
| **Subscription** | `CronBillingRoute.test.ts` | Vercel Cron 엔드포인트 Bearer 인증 및 API 라우트 핸들러 검증 |
| **Note** | `CreateNoteUseCase.test.ts` | 유료 구독자만 메모 생성 가능 (미결제자 차단) 및 제목 유효성 |
| **Note** | `DeleteNoteUseCase.test.ts` | 유료 구독자 메모 삭제 권한 및 빈 ID 예외 처리 |
| **Note** | `GetNoteDetailUseCase.test.ts` | 유료 구독자 메모 상세 조회 및 존재하지 않는 메모 null 반환 |
| **Note** | `GetNotesUseCase.test.ts` | 유료 구독자의 전체 노트 목록 조회 및 유저 ID 필수 검증 |
| **Note** | `SaveNoteTitleUseCase.test.ts` | 유료 구독자의 인라인 메모 제목 실시간 자동 저장 |
| **Note** | `ToggleNotePinUseCase.test.ts` | 메모 상단 고정(Pin) 상태 토글 |
| **Landing** | `GetLandingDataUseCase.test.ts` | 랜딩 페이지 히어로 카피, 메트릭, 3대 기능, 후기 데이터 조회 |
| **Dashboard** | `GetDashboardDataUseCase.test.ts` | 대시보드 4대 핵심 통계(전체 메모, 고정 노트, 신규 작성, 스토리지) 및 최근 활동 조회 |

---

## 2. 테스트 작성 및 수정 시 원칙

1. **Clean Architecture 계층 분리 엄수**:
   - Application UseCase 테스트는 반드시 Mock Repository 인터페이스(`src/**/domain/repositories/`)를 주입하여 순수 단위 테스트로 실행해야 합니다.
   - 외부 네트워크나 실제 Supabase/Toss API를 호출하지 않아야 합니다.
2. **권한 게이팅 원칙**:
   - CloudNote의 모든 핵심 메모 행위(생성, 수정, 삭제, 조회)는 `CheckNotePermissionUseCase` 또는 `INoteRepository`를 통해 구독 상태가 검증되어야 합니다.
3. **일자/시간 의존성 제어**:
   - 정기 결제 크론(`ProcessTodayDueBillingsUseCase`) 테스트 시에는 시스템 시각에 의존하지 않도록 `targetDate` 파라미터를 사용하여 테스트의 결정론(Determinism)을 보장합니다.
