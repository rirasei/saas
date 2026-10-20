import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DeleteNoteUseCase } from './DeleteNoteUseCase';
import { CreateNoteData, INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { NoteSummary } from '../../domain/models/NoteSummary';

class MockNoteRepository implements INoteRepository {
  public deletedNotes: string[] = [];

  async createNote(_data: CreateNoteData): Promise<NoteDetail> {
    return {} as NoteDetail;
  }
  async getNoteById(_noteId: string, _userId: string): Promise<NoteDetail | null> {
    return null;
  }
  async saveNoteTitle(_noteId: string, _title: string): Promise<void> {}
  async toggleChecklist(_blockId: string, _isCompleted: boolean): Promise<void> {}
  async getNotes(_userId: string): Promise<NoteSummary[]> {
    return [];
  }
  async deleteNote(noteId: string): Promise<void> {
    this.deletedNotes.push(noteId);
  }
  async togglePin(_noteId: string, _isPinned: boolean): Promise<void> {}
}

describe('DeleteNoteUseCase', () => {
  test('유효한 노트 ID로 삭제를 수행한다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new DeleteNoteUseCase(repo);

    await useCase.execute('note-123');

    assert.strictEqual(repo.deletedNotes.length, 1);
    assert.strictEqual(repo.deletedNotes[0], 'note-123');
  });

  test('노트 ID가 비어있으면 에러를 던진다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new DeleteNoteUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute('');
    }, /노트 ID가 유효하지 않습니다/);
  });

  test('결제가 완료되지 않은 사용자가 삭제 시 에러를 던진다', async () => {
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
    const useCase = new DeleteNoteUseCase(repo, mockSubRepo);

    await assert.rejects(async () => {
      await useCase.execute('note-123', 'user-unpaid');
    }, /결제가 완료된 회원만 노트를 삭제할 수 있습니다/);
  });
});
