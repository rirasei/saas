export interface NoteSummary {
  id: string;
  title: string;
  folderName: string;
  iconEmoji: string;
  tags: string[];
  priority: 'P0' | 'P1' | 'P2' | 'NONE';
  isPinned: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'TRASHED';
  updatedAt: string;
  wordCount: number;
}
