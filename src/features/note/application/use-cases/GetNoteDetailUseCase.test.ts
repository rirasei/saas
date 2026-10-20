import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GetNoteDetailUseCase } from './GetNoteDetailUseCase';
import { CreateNoteData, INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';

class MockNoteRepository implements INoteRepository {
  async createNote(_data: CreateNoteData): Promise<NoteDetail> {
    return {} as NoteDetail;
  }
  async getNoteById(noteId: string, _userId: string): Promise<NoteDetail | null> {
    if (noteId === 'not-found') return null;
    return {
      id: noteId,
      workspaceId: 'ws-1',
      title: '2026 Q4 SaaS 신규 기능 로드맵',
      folderName: '제품 기획',
      iconEmoji: '🚀',
      tags: ['#제품기획', '#로드맵'],
      isPinned: true,
      wordCount: 842,
      readingTimeMinutes: 3,
      syncStatusText: '방금 전 자동 저장됨',
      aiSummary: {
        title: 'AI 자동 요약 및 주요 목표',
        description: '오프라인 퍼스트 동기화 및 실시간 다중 커서 협업 엔진 구축',
        badgeText: '클라우드엔진 v4 기준 분석',
      },
      checklists: [
        { id: 'c1', text: 'SQLite WASM 로컬 캐시 레이어 구현', isCompleted: true },
        { id: 'c2', text: 'AI 지능형 3줄 요약 연동', isCompleted: false },
      ],
      author: {
        name: '서연',
        versionHash: 'rev-88402f',
        encryptionStatus: 'AES-256 GCM',
      },
    };
  }

  async saveNoteTitle(_noteId: string, _title: string): Promise<void> {}
  async toggleChecklist(_blockId: string, _isCompleted: boolean): Promise<void> {}
  async getNotes(_userId: string) {
    return [];
  }
  async deleteNote(_noteId: string): Promise<void> {}
  async togglePin(_noteId: string, _isPinned: boolean): Promise<void> {}
}

describe('GetNoteDetailUseCase', () => {
  test('존재하는 노트 ID로 조회 시 상세 정보를 반환한다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new GetNoteDetailUseCase(repo);

    const result = await useCase.execute('note-1', 'user-1');

    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.title, '2026 Q4 SaaS 신규 기능 로드맵');
    assert.strictEqual(result?.checklists.length, 2);
  });

  test('존재하지 않는 노트 ID로 조회 시 null을 반환한다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new GetNoteDetailUseCase(repo);

    const result = await useCase.execute('not-found', 'user-1');

    assert.strictEqual(result, null);
  });

  test('결제가 완료되지 않은 사용자가 상세 조회 시 에러를 던진다', async () => {
    const repo = new MockNoteRepository();
    const mockSubRepo = {
      getSubscriptionByUserId: async () => null,
      activateSubscription: async () => { throw new Error(); },
      hasActiveSubscription: async () => false,
      recordPaymentAttempt: async () => {},
      cancelSubscription: async () => {},
      createPendingPayment: async () => ({} as any),
      getPendingPayment: async () => null,
      getPaymentTransactions: async () => [],
      getUserSubscriptionDetails: async () => ({ subscription: null, transactions: [], isAlreadyPaid: false }),
      resumeSubscription: async () => {},
      refundPayment: async () => {},
    };
    const useCase = new GetNoteDetailUseCase(repo, mockSubRepo);

    await assert.rejects(async () => {
      await useCase.execute('note-1', 'user-unpaid');
    }, /결제가 완료된 회원만 노트를 조회할 수 있습니다/);
  });
});
