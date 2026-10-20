export interface DashboardMetric {
  totalNotes: number;
  totalNotesChangePercent: number;
  pinnedNotes: number;
  pinnedRatioPercent: number;
  weeklyNotes: number;
  weeklyGoalReached: boolean;
  storageUsedBytes: number;
  storageLimitBytes: number;
  storageUsedPercent: number;
}

export interface DashboardNoteCard {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  isPinned: boolean;
  updatedAtText: string;
  collaborators: { name: string; initial: string; colorClass: string }[];
}

export interface DashboardFolder {
  id: string;
  name: string;
  description: string;
  iconName: string;
  colorClass: string;
  count: number;
}

export interface DashboardTag {
  id: string;
  name: string;
  count: number;
}

export interface DashboardActivityLog {
  id: string;
  noteId: string;
  title: string;
  versionText: string;
  folderName: string;
  lastEditorName: string;
  lastEditorInitial: string;
  status: 'SYNCED' | 'EDITING' | 'READONLY';
  updatedAtText: string;
}

export interface DashboardSubscriptionInfo {
  status: string;
  plan?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
  workspace: {
    id: string;
    name: string;
    storageUsedBytes: number;
    storageLimitBytes: number;
  };
  metrics: DashboardMetric;
  recentNotes: DashboardNoteCard[];
  folders: DashboardFolder[];
  tags: DashboardTag[];
  activities: DashboardActivityLog[];
  subscription?: DashboardSubscriptionInfo | null;
}
