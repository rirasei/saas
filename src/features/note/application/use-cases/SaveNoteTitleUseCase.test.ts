import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SaveNoteTitleUseCase } from './SaveNoteTitleUseCase';
import { CreateNoteData, INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';

class MockNoteRepository implements INoteRepository {
  public savedTitle = '';

  async createNote(_data: CreateNoteData): Promise<NoteDetail> {
    return {} as NoteDetail;
  }
  async getNoteById(_noteId: string, _userId: string): Promise<NoteDetail | null> {
    return null;
  }

  async saveNoteTitle(_noteId: string, title: string): Promise<void> {
    this.savedTitle = title;
  }

  async toggleChecklist(_blockId: string, _isCompleted: boolean): Promise<void> {}
  async getNotes(_userId: string) {
    return [];
  }
  async deleteNote(_noteId: string): Promise<void> {}
  async togglePin(_noteId: string, _isPinned: boolean): Promise<void> {}
}

describe('SaveNoteTitleUseCase', () => {
  test('유효한 제목을 저장한다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new SaveNoteTitleUseCase(repo);

    await useCase.execute('note-1', '수정된 로드맵 제목');

    assert.strictEqual(repo.savedTitle, '수정된 로드맵 제목');
  });

  test('빈 제목 입력 시 에러를 던진다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new SaveNoteTitleUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute('note-1', '   ');
    }, /노트 제목을 입력해 주세요/);
  });

  test('결제가 완료되지 않은 사용자가 수정 시 에러를 던진다', async () => {
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
    const useCase = new SaveNoteTitleUseCase(repo, mockSubRepo);

    await assert.rejects(async () => {
      await useCase.execute('note-1', '수정 제목', 'user-unpaid');
    }, /결제가 완료된 회원만 노트를 수정할 수 있습니다/);
  });
});
