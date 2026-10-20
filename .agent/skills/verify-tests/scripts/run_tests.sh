#!/usr/bin/env bash
# run_tests.sh - Test execution and verification helper for CloudNote SaaS
set -euo pipefail

TARGET="${1:-all}"

echo "=========================================="
echo " 🧪 CloudNote Test Suite Runner: [${TARGET}]"
echo "=========================================="

case "$TARGET" in
  all)
    echo "Running all unit and integration test suites..."
    npx -y tsx --test 'src/**/*.test.ts'
    ;;
  note)
    echo "Running Note feature domain tests..."
    npx -y tsx --test 'src/features/note/**/*.test.ts'
    ;;
  subscription|billing|payment)
    echo "Running Subscription & Toss Payments test suites..."
    npx -y tsx --test 'src/features/subscription/**/*.test.ts'
    ;;
  cron)
    echo "Running Recurring Billing Cron & Repository tests..."
    npx -y tsx --test 'src/features/subscription/**/CronBillingRoute.test.ts' 'src/features/subscription/**/ProcessTodayDueBillingsUseCase.test.ts' 'src/features/subscription/**/BillingRepository.test.ts'
    ;;
  landing|dashboard)
    echo "Running Landing & Dashboard feature tests..."
    npx -y tsx --test 'src/features/landing/**/*.test.ts' 'src/features/dashboard/**/*.test.ts'
    ;;
  clean|check)
    echo "1/2 Running test suite..."
    npx -y tsx --test 'src/**/*.test.ts'
    echo "2/2 Checking Next.js production build..."
    npm run build
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Available options: all, note, subscription, cron, landing, clean"
    exit 1
    ;;
esac

echo ""
echo "✅ All tests completed successfully!"
