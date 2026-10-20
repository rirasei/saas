import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GetNotesUseCase } from './GetNotesUseCase';
import { CreateNoteData, INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { NoteSummary } from '../../domain/models/NoteSummary';

class MockNoteRepository implements INoteRepository {
  async createNote(_data: CreateNoteData): Promise<NoteDetail> {
    return {} as NoteDetail;
  }
  async getNoteById(_noteId: string, _userId: string): Promise<NoteDetail | null> {
    return null;
  }
  async saveNoteTitle(_noteId: string, _title: string): Promise<void> {}
  async toggleChecklist(_blockId: string, _isCompleted: boolean): Promise<void> {}

  async getNotes(userId: string): Promise<NoteSummary[]> {
    if (!userId) return [];
    return [
      {
        id: 'note-1',
        title: 'Q4 제품 로드맵',
        folderName: '제품 기획',
        iconEmoji: '🚀',
        tags: ['#기획', '#로드맵'],
        priority: 'P0',
        isPinned: true,
        status: 'ACTIVE',
        updatedAt: '10분 전',
        wordCount: 842,
      },
      {
        id: 'note-2',
        title: 'GraphQL 캐싱 설계서',
        folderName: '개발 아키텍처',
        iconEmoji: '⚡',
        tags: ['#인프라', '#API'],
        priority: 'P1',
        isPinned: false,
        status: 'ACTIVE',
        updatedAt: '42분 전',
        wordCount: 1204,
      },
    ];
  }

  async deleteNote(_noteId: string): Promise<void> {}
  async togglePin(_noteId: string, _isPinned: boolean): Promise<void> {}
}

describe('GetNotesUseCase', () => {
  test('사용자 ID로 노트 목록을 조회하여 반환한다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new GetNotesUseCase(repo);

    const notes = await useCase.execute('user-1');

    assert.strictEqual(notes.length, 2);
    assert.strictEqual(notes[0].title, 'Q4 제품 로드맵');
    assert.strictEqual(notes[0].priority, 'P0');
  });

  test('사용자 ID가 없으면 에러를 던진다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new GetNotesUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute('');
    }, /사용자 ID가 유효하지 않습니다/);
  });

  test('결제가 완료되지 않은 사용자가 조회 시 에러를 던진다', async () => {
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
    const useCase = new GetNotesUseCase(repo, mockSubRepo);

    await assert.rejects(async () => {
      await useCase.execute('user-unpaid');
    }, /결제가 완료된 회원만 노트를 조회할 수 있습니다/);
  });
});
