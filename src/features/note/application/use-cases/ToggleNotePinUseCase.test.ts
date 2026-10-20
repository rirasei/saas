import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ToggleNotePinUseCase } from './ToggleNotePinUseCase';
import { CreateNoteData, INoteRepository } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { NoteSummary } from '../../domain/models/NoteSummary';

class MockNoteRepository implements INoteRepository {
  public pinState: Record<string, boolean> = {};

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
  async deleteNote(_noteId: string): Promise<void> {}
  async togglePin(noteId: string, isPinned: boolean): Promise<void> {
    this.pinState[noteId] = isPinned;
  }
}

describe('ToggleNotePinUseCase', () => {
  test('유효한 노트 ID와 고정 여부로 고정 상태를 토글한다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new ToggleNotePinUseCase(repo);

    await useCase.execute('note-123', true);
    assert.strictEqual(repo.pinState['note-123'], true);

    await useCase.execute('note-123', false);
    assert.strictEqual(repo.pinState['note-123'], false);
  });

  test('노트 ID가 비어있으면 에러를 던진다', async () => {
    const repo = new MockNoteRepository();
    const useCase = new ToggleNotePinUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute('', true);
    }, /노트 ID가 유효하지 않습니다/);
  });
});
