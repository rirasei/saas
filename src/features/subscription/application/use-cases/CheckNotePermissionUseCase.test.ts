import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CheckNotePermissionUseCase } from './CheckNotePermissionUseCase';
import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { Subscription } from '../../domain/models/Subscription';

class MockSubscriptionRepository implements ISubscriptionRepository {
  private subscriptions: Map<string, Subscription> = new Map();

  setSubscription(userId: string, sub: Subscription) {
    this.subscriptions.set(userId, sub);
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  async activateSubscription(): Promise<Subscription> {
    throw new Error('Not implemented');
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = this.subscriptions.get(userId);
    return sub?.status === 'ACTIVE';
  }

  async recordPaymentAttempt(): Promise<void> {}
  async cancelSubscription(userId: string): Promise<void> {
    const sub = this.subscriptions.get(userId);
    if (sub) {
      sub.status = 'CANCELED';
    }
  }
  async createPendingPayment(): Promise<any> {
    return {} as any;
  }
  async getPendingPayment(): Promise<any> {
    return null;
  }
  async getPaymentTransactions(): Promise<any[]> { return []; }
  async getUserSubscriptionDetails(): Promise<any> { return { subscription: null, transactions: [], isAlreadyPaid: false }; }
  async resumeSubscription(): Promise<void> {}
  async refundPayment(): Promise<void> {}
}

describe('CheckNotePermissionUseCase', () => {
  test('토스페이먼츠 결제가 완료되어 ACTIVE 상태인 사용자는 노트 생성, 수정, 삭제, 조회 권한을 모두 갖는다', async () => {
    const repo = new MockSubscriptionRepository();
    repo.setSubscription('user-active-1', {
      id: 'sub-1',
      workspaceId: 'ws-1',
      userId: 'user-active-1',
      plan: 'PRO',
      billingCycle: 'YEARLY',
      status: 'ACTIVE',
      aiCreditLimit: 500,
      aiCreditUsed: 10,
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2027-10-15T00:00:00Z',
    });

    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('user-active-1');

    assert.strictEqual(permission.canCreate, true);
    assert.strictEqual(permission.canRead, true);
    assert.strictEqual(permission.canUpdate, true);
    assert.strictEqual(permission.canDelete, true);
  });

  test('결제가 완료되지 않은 TRIALING 사용자는 노트 생성, 수정, 삭제, 조회 권한이 제한된다', async () => {
    const repo = new MockSubscriptionRepository();
    repo.setSubscription('user-trial-1', {
      id: 'sub-2',
      workspaceId: 'ws-1',
      userId: 'user-trial-1',
      plan: 'PRO',
      billingCycle: 'YEARLY',
      status: 'TRIALING',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2026-10-29T00:00:00Z',
    });

    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('user-trial-1');

    assert.strictEqual(permission.canCreate, false);
    assert.strictEqual(permission.canRead, false);
    assert.strictEqual(permission.canUpdate, false);
    assert.strictEqual(permission.canDelete, false);
    assert.ok(permission.reason?.includes('결제'));
  });

  test('구독 정보가 없는 사용자는 권한이 제한된다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('non-existent-user');

    assert.strictEqual(permission.canCreate, false);
    assert.strictEqual(permission.canRead, false);
    assert.strictEqual(permission.canUpdate, false);
    assert.strictEqual(permission.canDelete, false);
  });

  test('userId가 비어있으면 권한이 제한된다', async () => {
    const repo = new MockSubscriptionRepository();
    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('');

    assert.strictEqual(permission.canCreate, false);
    assert.strictEqual(permission.canRead, false);
    assert.strictEqual(permission.canUpdate, false);
    assert.strictEqual(permission.canDelete, false);
  });

  test('사용자가 결제를 취소하여 CANCELED 상태인 경우 권한이 제한된다', async () => {
    const repo = new MockSubscriptionRepository();
    repo.setSubscription('user-canceled-1', {
      id: 'sub-c-1',
      workspaceId: 'ws-1',
      userId: 'user-canceled-1',
      plan: 'PRO',
      billingCycle: 'YEARLY',
      status: 'CANCELED',
      aiCreditLimit: 0,
      aiCreditUsed: 0,
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2026-10-15T00:00:00Z',
    });

    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('user-canceled-1');

    assert.strictEqual(permission.canCreate, false);
    assert.strictEqual(permission.canRead, false);
    assert.strictEqual(permission.canUpdate, false);
    assert.strictEqual(permission.canDelete, false);
  });

  test('구독을 취소(CANCELED)했더라도 현재 결제 주기 만료일(currentPeriodEnd)이 아직 도래하지 않은 경우 권한이 유지된다', async () => {
    const repo = new MockSubscriptionRepository();
    repo.setSubscription('user-canceled-with-period', {
      id: 'sub-c-valid',
      workspaceId: 'ws-1',
      userId: 'user-canceled-with-period',
      plan: 'PRO',
      billingCycle: 'MONTHLY',
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      aiCreditLimit: 500,
      aiCreditUsed: 10,
      currentPeriodStart: new Date(Date.now() - 5 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 25 * 86400000).toISOString(),
    });

    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('user-canceled-with-period');

    assert.strictEqual(permission.canCreate, true);
    assert.strictEqual(permission.canRead, true);
    assert.strictEqual(permission.canUpdate, true);
    assert.strictEqual(permission.canDelete, true);
  });


  test('결제 모듈이 시작되어 PENDING 상태인 경우 아직 결제가 완료되지 않았으므로 권한이 제한된다', async () => {
    const repo = new MockSubscriptionRepository();
    // In PENDING state, subscription is not ACTIVE yet
    repo.setSubscription('user-pending-1', {
      id: 'sub-p-1',
      workspaceId: 'ws-1',
      userId: 'user-pending-1',
      plan: 'PRO',
      billingCycle: 'YEARLY',
      status: 'TRIALING',
      aiCreditLimit: 0,
      aiCreditUsed: 0,
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2026-10-15T00:00:00Z',
    });

    const useCase = new CheckNotePermissionUseCase(repo);
    const permission = await useCase.execute('user-pending-1');

    assert.strictEqual(permission.canCreate, false);
    assert.strictEqual(permission.canRead, false);
    assert.strictEqual(permission.canUpdate, false);
    assert.strictEqual(permission.canDelete, false);
  });
});
