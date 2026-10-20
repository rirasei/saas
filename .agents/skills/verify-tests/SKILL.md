---
name: verify-tests
description: >-
  Run, verify, and diagnose the automated test suite for this CloudNote SaaS project.
  Use this skill whenever the user asks to run tests, verify test coverage, check Clean Architecture
  use-case logic, or diagnose test failures across note, subscription, billing, dashboard, or landing modules.
---

# Verify Tests Skill (CloudNote SaaS)

This skill guides the agent and developer through executing, validating, and diagnosing the automated test suite in the CloudNote SaaS repository.

The test suite is built on top of **Node.js Native Test Runner (`node:test`)** executed via `tsx --test`, ensuring high execution speed without heavyweight framework overhead.

---

## 🚀 Quick Execution Guide

Run the preconfigured test runner script from the repository root:

```bash
# Run all 21 test suites (65 tests)
./.agents/skills/verify-tests/scripts/run_tests.sh all
# or standard npm script:
npm test
```

### Feature-Specific Test Targets

To verify a single domain slice without running the entire suite:

| Target Domain | Runner Command | What It Verifies |
| :--- | :--- | :--- |
| **Note Domain** | `./.agents/skills/verify-tests/scripts/run_tests.sh note` | Memo CRUD, permission gating, pin toggling, title auto-save |
| **Subscription & Toss** | `./.agents/skills/verify-tests/scripts/run_tests.sh subscription` | Payment confirmation, billing keys, cancellations, refunds |
| **Recurring Cron & Batch** | `./.agents/skills/verify-tests/scripts/run_tests.sh cron` | Batch billing due date filtering, Vercel cron auth, route handler |
| **Landing & Dashboard** | `./.agents/skills/verify-tests/scripts/run_tests.sh landing` | Landing metrics, hero content, dashboard aggregates |
| **Full Health Check** | `./.agents/skills/verify-tests/scripts/run_tests.sh clean` | Runs all tests + runs `npm run build` static generation |

---

## 📋 Test Matrix Reference

For detailed mappings of all 21 test suites and their business validation rules, refer to:
[references/test_matrix.md](./references/test_matrix.md)

---

## 🛠 Step-by-Step Test Verification Workflow

### Step 1: Run Target Tests
Before committing any changes or after refactoring a use case, run the relevant test suite:
```bash
npm test
```
Verify that the output reports:
```text
ℹ tests 65
ℹ suites 21
ℹ pass 65
ℹ fail 0
```

### Step 2: Clean Architecture Boundary Check
Ensure all use-case tests adhere to Clean Architecture standards:
1. **Application Layer Isolation**: Tests in `src/features/*/application/use-cases/*.test.ts` must only import Domain Models and Interfaces (`src/features/*/domain/`). They must NOT import Next.js server actions, React components, or direct Supabase clients.
2. **In-Memory Mock Repositories**: Test suites must mock repository interfaces locally (e.g. `MockNoteRepository implements INoteRepository`) to remain deterministic, fast, and free of network I/O.

### Step 3: Failure Diagnosis & Resolution

If a test fails, follow this diagnostic checklist:

1. **Permission Gating Failure (`SUBSCRIPTION_REQUIRED` / `ACTIVE` Check)**:
   - *Symptom*: A Note use case throws `Error('유료 구독(ACTIVE) 회원만 이용 가능합니다.')` unexpectedly.
   - *Fix*: In the test setup, ensure the user has an `ACTIVE` subscription or that `CheckNotePermissionUseCase` returns `hasAccess: true`. Note that users with `CANCELED` status retain access until `currentPeriodEnd`.
2. **Date & Time Sensitivity in Billing**:
   - *Symptom*: `ProcessTodayDueBillingsUseCase` or `BillingRepository` returns 0 processed billings.
   - *Fix*: Pass an explicit `targetDate` string (e.g. `'2026-10-20'`) to the use case instead of relying on `new Date()`, ensuring matching date timestamps with mocked database records.
3. **Promise / Async Handling**:
   - *Symptom*: Unhandled rejection or assertion called before async resolution.
   - *Fix*: Ensure all `await useCase.execute(...)` calls are awaited and wrapped in `assert.rejects()` when testing expected business errors.

### Step 4: Verification Gate Before Push
Always run the full build verification before pushing code to `main`:
```bash
npm test && npm run build
```
If both commands exit with code `0`, the repository is ready for Vercel production deployment.
