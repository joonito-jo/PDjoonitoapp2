import type { Concept, KnowledgeData, Recall, RecentItem, Settings, WrongNote } from '../types';
import { defaultSettings, initialData } from '../data/initialData';
import { nowISO, todayISO } from './date';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uniqueId(prefix: string, used: Set<string>): string {
  let index = 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  const id = `${prefix}-${index}`;
  used.add(id);
  return id;
}

function ensureUniqueIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const used = new Set<string>();
  return items.map((item) => {
    if (!item.id || used.has(item.id)) {
      return { ...item, id: uniqueId(prefix, used) };
    }
    used.add(item.id);
    return item;
  });
}

function normalizeRecentItem(item: any): RecentItem {
  return {
    id: str(item.id, `recent-${Date.now()}`),
    type: item.type === 'recall' ? 'recall' : 'concept',
    targetId: str(item.targetId, ''),
    title: str(item.title, ''),
    path: str(item.path, ''),
    viewedAt: str(item.viewedAt, nowISO())
  };
}

function mergeSettings(raw: any): Settings {
  const source = raw && typeof raw === 'object' ? raw : {};
  const recent = source.recentInput || {};
  const statusOptions = Array.isArray(source.statusOptions) && source.statusOptions.length > 0 ? source.statusOptions.map(String) : defaultSettings.statusOptions;
  return {
    appName: str(source.appName, defaultSettings.appName),
    subtitle: str(source.subtitle, defaultSettings.subtitle),
    statusOptions,
    reviewIntervals: {
      ...defaultSettings.reviewIntervals,
      ...(source.reviewIntervals && typeof source.reviewIntervals === 'object' ? source.reviewIntervals : {})
    },
    recentInput: {
      subject: str(recent.subject, ''),
      unit: str(recent.unit || recent.topic, ''),
      topic: str(recent.topic, ''),
      conceptId: str(recent.conceptId, '')
    },
    recentItems: asArray<any>(source.recentItems).map(normalizeRecentItem).filter((item) => item.targetId).slice(0, 10),
    subjects: Array.isArray(source.subjects) ? source.subjects.map(String) : []
  };
}

function normalizeConcept(item: any, settings: Settings): Concept {
  const createdAt = str(item.createdAt, nowISO());
  const status = str(item.status, settings.statusOptions[0] || '미학습');
  if (!settings.statusOptions.includes(status)) settings.statusOptions.push(status);
  const title = str(item.title || item.front || item.name || item.topic, '제목 없음');
  const unit = str(item.unit || item.bigTopic || item.category || '', str(item.topic, ''));
  const topic = str(item.topic || title, title);
  return {
    id: str(item.id, `C-${Date.now()}`),
    subject: str(item.subject, '미분류'),
    unit,
    topic,
    title,
    summaryNote: str(item.summaryNote || item.note || item.summary_note, ''),
    description: str(item.description || item.summary || item.back, ''),
    importance: num(item.importance, 3),
    status,
    keywords: str(item.keywords, ''),
    source: str(item.source, ''),
    memo: str(item.memo || item.front || item.back, ''),
    isFavorite: Boolean(item.isFavorite),
    isDeleted: Boolean(item.isDeleted),
    createdAt,
    updatedAt: str(item.updatedAt, createdAt)
  };
}

function normalizeRecall(item: any, settings: Settings): Recall {
  const createdAt = str(item.createdAt, nowISO());
  const status = str(item.status, settings.statusOptions[0] || '미학습');
  if (!settings.statusOptions.includes(status)) settings.statusOptions.push(status);
  return {
    id: str(item.id, `R-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`),
    conceptId: str(item.conceptId, ''),
    question: str(item.question || item.front, ''),
    answer: str(item.answer || item.back, ''),
    explanation: str(item.explanation, ''),
    source: str(item.source, ''),
    keywords: str(item.keywords, ''),
    importance: num(item.importance, 3),
    type: str(item.type, '단답형'),
    difficulty: num(item.difficulty, 2),
    isPastExam: str(item.isPastExam || item.pastExam || item.examLinked, ''),
    status,
    isFavorite: Boolean(item.isFavorite),
    isDeleted: Boolean(item.isDeleted),
    reviewCount: num(item.reviewCount, num(item.correctCount, 0) + num(item.wrongCount, 0)),
    correctStreak: num(item.correctStreak, 0),
    wrongCount: num(item.wrongCount, 0),
    lastReviewedAt: str(item.lastReviewedAt, ''),
    nextReviewAt: str(item.nextReviewAt, todayISO()),
    createdAt,
    updatedAt: str(item.updatedAt, createdAt)
  };
}

function normalizeWrongNote(item: any): WrongNote {
  const createdAt = str(item.createdAt || item.date, nowISO());
  return {
    id: str(item.id, `W-${Date.now()}`),
    recallId: str(item.recallId || item.itemId, ''),
    conceptId: str(item.conceptId, ''),
    question: str(item.question, ''),
    answer: str(item.answer || item.correctAnswer, ''),
    userAnswer: str(item.userAnswer, ''),
    memo: str(item.memo || item.reason, ''),
    wrongCount: num(item.wrongCount, 1),
    createdAt,
    updatedAt: str(item.updatedAt, createdAt)
  };
}

export function normalizeData(raw: unknown): KnowledgeData {
  if (!raw || typeof raw !== 'object') return initialData;
  const obj = raw as any;
  const settings = mergeSettings(obj.settings);
  let concepts = asArray<any>(obj.concepts).map((c) => normalizeConcept(c, settings));
  let recalls = asArray<any>(obj.recalls).map((r) => normalizeRecall(r, settings)).filter((r) => r.question || r.answer);
  let wrongNotes = asArray<any>(obj.wrongNotes || obj.mistakes).map(normalizeWrongNote);
  concepts = ensureUniqueIds(concepts, 'C');
  recalls = ensureUniqueIds(recalls, 'R');
  wrongNotes = ensureUniqueIds(wrongNotes, 'W');
  const subjectSet = new Set<string>([...settings.subjects, ...asArray<string>(obj.subjects), ...concepts.map((c) => c.subject)].filter(Boolean));
  const topicSet = new Set<string>([...asArray<string>(obj.topics), ...concepts.map((c) => c.topic)].filter(Boolean));
  settings.subjects = Array.from(subjectSet);
  return {
    version: 6.5,
    settings,
    subjects: Array.from(subjectSet),
    topics: Array.from(topicSet),
    concepts,
    recalls,
    wrongNotes,
    reviewLogs: asArray<any>(obj.reviewLogs)
  };
}
