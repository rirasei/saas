import { INoteRepository } from '../../domain/repositories/NoteRepository.interface';

export class ToggleNotePinUseCase {
  constructor(private readonly noteRepo: INoteRepository) {}

  async execute(noteId: string, isPinned: boolean): Promise<void> {
    if (!noteId || noteId.trim() === '') {
      throw new Error('노트 ID가 유효하지 않습니다.');
    }
    await this.noteRepo.togglePin(noteId, isPinned);
  }
}
