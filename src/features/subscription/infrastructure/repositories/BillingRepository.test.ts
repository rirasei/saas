import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BillingRepository } from './BillingRepository';
import { TossPaymentRepository } from './TossPaymentRepository';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/src/shared/types/database.types';

function createMockSupabase(workspacesData: any[], subscriptionsData: any[] = []) {
  return {
    from: (table: string) => {
      if (table === 'workspaces') {
        return {
          select: () => Promise.resolve({ data: workspacesData, error: null }),
        };
      }
      if (table === 'subscriptions') {
        return {
          select: () => Promise.resolve({ data: subscriptionsData, error: null }),
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    },
  } as unknown as SupabaseClient<Database>;
}

describe('BillingRepository.findDueBillings (TDD)', () => {
  it('시간과 관계없이 오늘(또는 오늘 이전) 결제해야 하는 빌링키 목록만 정확히 필터링한다', async () => {
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);

    const todayNight = new Date();
    todayNight.setHours(23, 45, 0, 0); // 밤 늦은 시간이라도 오늘이면 포함

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000); // 과거 결제 누락분 포함

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000); // 내일 결제는 제외

    const mockWorkspaces = [
      {
        id: 'ws_today_1',
        owner_id: 'user_1',
        settings: {
          billing: {
            billingKey: 'key_today_1',
            customerKey: 'user_1',
            nextBillingDate: todayNoon.toISOString(),
            cycleDays: 30,
            cardCompany: '현대',
          },
        },
      },
      {
        id: 'ws_today_2',
        owner_id: 'user_2',
        settings: {
          billing: {
            billingKey: 'key_today_2',
            customerKey: 'user_2',
            nextBillingDate: todayNight.toISOString(),
            cycleDays: 30,
            cardCompany: '삼성',
          },
        },
      },
      {
        id: 'ws_yesterday',
        owner_id: 'user_3',
        settings: {
          billing: {
            billingKey: 'key_yesterday',
            customerKey: 'user_3',
            nextBillingDate: yesterday.toISOString(),
            cycleDays: 30,
          },
        },
      },
      {
        id: 'ws_tomorrow',
        owner_id: 'user_4',
        settings: {
          billing: {
            billingKey: 'key_tomorrow',
            customerKey: 'user_4',
            nextBillingDate: tomorrow.toISOString(),
            cycleDays: 30,
          },
        },
      },
      {
        id: 'ws_no_billing',
        owner_id: 'user_5',
        settings: {},
      },
    ];

    const repo = new BillingRepository(
      {} as TossPaymentRepository,
      createMockSupabase(mockWorkspaces)
    );

    const dueList = await repo.findDueBillings();

    assert.strictEqual(dueList.length, 3);
    const keys = dueList.map((d) => d.billingKey);
    assert.ok(keys.includes('key_today_1'));
    assert.ok(keys.includes('key_today_2'));
    assert.ok(keys.includes('key_yesterday'));
    assert.ok(!keys.includes('key_tomorrow'));
  });

  it('워크스페이스가 없거나 등록된 빌링키가 없으면 빈 배열을 반환한다', async () => {
    const repo = new BillingRepository(
      {} as TossPaymentRepository,
      createMockSupabase([])
    );

    const dueList = await repo.findDueBillings();
    assert.deepStrictEqual(dueList, []);
  });
});
