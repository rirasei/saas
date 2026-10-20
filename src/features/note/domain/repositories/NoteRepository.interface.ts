import { NoteDetail } from '../models/NoteDetail';
import { NoteSummary } from '../models/NoteSummary';

export interface CreateNoteData {
  userId: string;
  workspaceId?: string;
  title: string;
  folderId?: string;
  folderName?: string;
}

export interface INoteRepository {
  getNoteById(noteId: string, userId: string): Promise<NoteDetail | null>;
  saveNoteTitle(noteId: string, title: string): Promise<void>;
  toggleChecklist(blockId: string, isCompleted: boolean): Promise<void>;
  getNotes(userId: string): Promise<NoteSummary[]>;
  deleteNote(noteId: string): Promise<void>;
  togglePin(noteId: string, isPinned: boolean): Promise<void>;
  createNote(data: CreateNoteData): Promise<NoteDetail>;
}
