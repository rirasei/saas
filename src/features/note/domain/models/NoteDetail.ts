export interface NoteChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  metadataText?: string;
}

export interface NoteDetail {
  id: string;
  workspaceId: string;
  title: string;
  folderName: string;
  iconEmoji: string;
  coverImageUrl?: string;
  sprintBadge?: string;
  priorityBadge?: string;
  tags: string[];
  isPinned: boolean;
  wordCount: number;
  readingTimeMinutes: number;
  syncStatusText: string;
  aiSummary: {
    title: string;
    description: string;
    badgeText: string;
  };
  checklists: NoteChecklistItem[];
  codeSnippet?: {
    filename: string;
    code: string;
  };
  author: {
    name: string;
    versionHash: string;
    encryptionStatus: string;
  };
}
