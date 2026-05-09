export type TabId = 'quickInput' | 'map' | 'study' | 'review' | 'wrongNotes' | 'importExport' | 'settings';

export type ReviewIntervals = {
  firstCorrect: number;
  secondCorrect: number;
  thirdCorrect: number;
  fourthCorrect: number;
  wrong: number;
  highImportanceModifier: number;
};

export type RecentItem = {
  id: string;
  type: 'concept' | 'recall';
  targetId: string;
  title: string;
  path: string;
  viewedAt: string;
};

export type Settings = {
  appName: string;
  subtitle: string;
  statusOptions: string[];
  reviewIntervals: ReviewIntervals;
  recentInput: {
    subject: string;
    unit: string;
    topic: string;
    conceptId: string;
  };
  recentItems: RecentItem[];
  subjects: string[];
};

export type Concept = {
  id: string;
  subject: string;
  unit: string;
  topic: string;
  title: string;
  summaryNote: string;
  description: string;
  importance: number;
  status: string;
  keywords: string;
  source: string;
  memo: string;
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Recall = {
  id: string;
  conceptId: string;
  question: string;
  answer: string;
  explanation: string;
  source: string;
  keywords: string;
  importance: number;
  type: string;
  difficulty: number;
  isPastExam: string;
  status: string;
  isFavorite: boolean;
  isDeleted: boolean;
  reviewCount: number;
  correctStreak: number;
  wrongCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WrongNote = {
  id: string;
  recallId: string;
  conceptId: string;
  question: string;
  answer: string;
  userAnswer: string;
  memo: string;
  wrongCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReviewLog = {
  id: string;
  recallId: string;
  conceptId: string;
  result: 'correct' | 'wrong';
  createdAt: string;
};

export type KnowledgeData = {
  version: number;
  settings: Settings;
  subjects: string[];
  topics: string[];
  concepts: Concept[];
  recalls: Recall[];
  wrongNotes: WrongNote[];
  reviewLogs: ReviewLog[];
};

export type BackupSnapshot = {
  id: string;
  createdAt: string;
  reason: string;
  data: KnowledgeData;
};

export type ToastState = { message: string; type?: 'success' | 'error' | 'info' } | null;

export type ConfirmState =
  | null
  | { type: 'reset'; title: string; message: string; requireText?: string; onConfirm: () => void }
  | { type: 'deleteProblem'; title: string; message: string; onConfirm: () => void }
  | { type: 'restoreBackup'; title: string; message: string; onConfirm: () => void }
  | { type: 'autoRepair'; title: string; message: string; onConfirm: () => void }
  | { type: 'deleteConcept'; title: string; message: string; onConfirm: (mode: 'unlink' | 'deleteAll') => void };

export type ProblemBlock = {
  localId: string;
  question: string;
  answer: string;
  explanation: string;
  source: string;
  keywords: string;
  importance: number;
  type: string;
  difficulty: number;
  isPastExam: string;
  memo: string;
};
