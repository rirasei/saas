import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GetDashboardDataUseCase } from './GetDashboardDataUseCase';
import { IDashboardRepository } from '../../domain/repositories/DashboardRepository.interface';
import { DashboardData } from '../../domain/models/DashboardData';

class MockDashboardRepository implements IDashboardRepository {
  async getDashboardData(userId: string): Promise<DashboardData> {
    return {
      user: {
        id: userId,
        email: 'test@cloudnote.io',
        name: '김서연',
      },
      workspace: {
        id: 'ws-123',
        name: '김서연의 워크스페이스',
        storageUsedBytes: 1500000000,
        storageLimitBytes: 15000000000,
      },
      metrics: {
        totalNotes: 142,
        totalNotesChangePercent: 14,
        pinnedNotes: 12,
        pinnedRatioPercent: 8.4,
        weeklyNotes: 8,
        weeklyGoalReached: true,
        storageUsedBytes: 1500000000,
        storageLimitBytes: 15000000000,
        storageUsedPercent: 9.3,
      },
      recentNotes: [],
      folders: [],
      tags: [],
      activities: [],
    };
  }
}

describe('GetDashboardDataUseCase', () => {
  test('정상적인 사용자 ID가 주어지면 대시보드 데이터를 반환한다', async () => {
    const mockRepo = new MockDashboardRepository();
    const useCase = new GetDashboardDataUseCase(mockRepo);

    const result = await useCase.execute('user-1');

    assert.strictEqual(result.user.name, '김서연');
    assert.strictEqual(result.metrics.totalNotes, 142);
    assert.strictEqual(result.metrics.weeklyNotes, 8);
  });

  test('사용자 ID가 없으면 에러를 던진다', async () => {
    const mockRepo = new MockDashboardRepository();
    const useCase = new GetDashboardDataUseCase(mockRepo);

    await assert.rejects(async () => {
      await useCase.execute('');
    }, /사용자 식별자가 유효하지 않습니다/);
  });
});
