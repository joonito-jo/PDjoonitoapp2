import type { Concept, KnowledgeData, Recall, WrongNote } from '../types';
import { nowISO, todayISO } from './date';
import { nextId } from './ids';
import { downloadJson } from './storage';

export type CheckSeverity = 'critical' | 'warning' | 'info';
export type CheckCategory = 'ID 문제' | '연결 문제' | '필수값 문제' | '상태값 문제' | '누락 필드 문제' | '날짜 문제' | '데이터 품질 참고';

export type DataCheckIssue = {
  id: string;
  severity: CheckSeverity;
  category: CheckCategory;
  issueType: string;
  targetType: 'concept' | 'recall' | 'wrongNote' | 'settings';
  targetId: string;
  currentState: string;
  recommendedAction: string;
  autoFixable: boolean;
};

export type DataCheckResult = {
  checkedAt: string;
  summary: {
    critical: number;
    warning: number;
    info: number;
    autoFixable: number;
    manualOnly: number;
  };
  issues: DataCheckIssue[];
  critical: DataCheckIssue[];
  warning: DataCheckIssue[];
  info: DataCheckIssue[];
  autoFixable: DataCheckIssue[];
  manualOnly: DataCheckIssue[];
};

export type AutoRepairResult = {
  data: KnowledgeData;
  fixedCount: number;
  messages: string[];
};

function isValidDateString(value: string): boolean {
  if (!value) return true;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function issue(
  issues: DataCheckIssue[],
  severity: CheckSeverity,
  category: CheckCategory,
  issueType: string,
  targetType: DataCheckIssue['targetType'],
  targetId: string,
  currentState: string,
  recommendedAction: string,
  autoFixable: boolean
) {
  issues.push({
    id: `CHECK-${issues.length + 1}`,
    severity,
    category,
    issueType,
    targetType,
    targetId,
    currentState,
    recommendedAction,
    autoFixable
  });
}

function findDuplicateIds<T extends { id: string }>(items: T[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  items.forEach((item) => {
    if (!item.id) return;
    if (seen.has(item.id)) duplicated.add(item.id);
    seen.add(item.id);
  });
  return Array.from(duplicated);
}

function checkMissingField(item: any, key: string): boolean {
  return !(key in item);
}

export function runDataCheck(data: KnowledgeData): DataCheckResult {
  const issues: DataCheckIssue[] = [];
  const conceptIds = new Set(data.concepts.map((concept) => concept.id));
  const recallIds = new Set(data.recalls.map((recall) => recall.id));
  const statusOptions = data.settings.statusOptions.length > 0 ? data.settings.statusOptions : ['미학습'];
  const today = todayISO();

  findDuplicateIds(data.concepts).forEach((id) => issue(issues, 'critical', 'ID 문제', '중복 concept id', 'concept', id, `concept id ${id}가 2개 이상 있습니다.`, '자동 복구 시 중복 항목에 새 id를 부여하고 연결된 문제를 보정합니다.', true));
  findDuplicateIds(data.recalls).forEach((id) => issue(issues, 'critical', 'ID 문제', '중복 recall id', 'recall', id, `recall id ${id}가 2개 이상 있습니다.`, '자동 복구 시 중복 문제에 새 id를 부여하고 오답노트 연결을 보정합니다.', true));
  findDuplicateIds(data.wrongNotes).forEach((id) => issue(issues, 'warning', 'ID 문제', '중복 wrongNote id', 'wrongNote', id, `wrongNote id ${id}가 2개 이상 있습니다.`, '자동 복구 시 중복 오답노트에 새 id를 부여합니다.', true));

  data.recalls.forEach((recall) => {
    if (!recall.conceptId) issue(issues, 'critical', '연결 문제', 'conceptId가 비어 있는 문제', 'recall', recall.id, '연결된 소개념이 없습니다.', '자동 복구 시 미분류 소개념으로 이동합니다.', true);
    else if (!conceptIds.has(recall.conceptId)) issue(issues, 'critical', '연결 문제', '존재하지 않는 conceptId를 가진 문제', 'recall', recall.id, `conceptId ${recall.conceptId}가 concepts에 없습니다.`, '자동 복구 시 미분류 소개념으로 이동합니다.', true);
    if (!recall.question) issue(issues, 'critical', '필수값 문제', '빈 문제', 'recall', recall.id, '문제 내용이 비어 있습니다.', '자동 삭제하지 않습니다. 수동으로 확인해 주세요.', false);
    if (!recall.answer) issue(issues, 'warning', '필수값 문제', '빈 정답', 'recall', recall.id, '정답이 비어 있습니다.', '자동 삭제하지 않습니다. 수동으로 확인해 주세요.', false);
    if (!statusOptions.includes(recall.status)) issue(issues, 'warning', '상태값 문제', 'settings.statusOptions에 없는 recall.status', 'recall', recall.id, `현재 상태: ${recall.status || '(없음)'}`, '자동 복구 시 기본 상태로 변경합니다.', true);
    ['isFavorite', 'isDeleted', 'reviewCount', 'correctStreak', 'wrongCount'].forEach((field) => {
      if (checkMissingField(recall, field)) issue(issues, 'warning', '누락 필드 문제', `recall.${field} 누락`, 'recall', recall.id, `${field} 필드가 없습니다.`, '자동 복구 시 기본값을 추가합니다.', true);
    });
    ['createdAt', 'updatedAt'].forEach((field) => {
      if (!recall[field as keyof Recall] || !isValidDateString(String(recall[field as keyof Recall]))) issue(issues, 'warning', '날짜 문제', `${field}이 없거나 잘못된 형식`, 'recall', recall.id, `${field}: ${String(recall[field as keyof Recall] || '(없음)')}`, '자동 복구 시 현재 시간으로 보정합니다.', true);
    });
    ['lastReviewedAt', 'nextReviewAt'].forEach((field) => {
      const value = String(recall[field as keyof Recall] || '');
      if (value && !isValidDateString(value)) issue(issues, 'warning', '날짜 문제', `${field}이 잘못된 형식`, 'recall', recall.id, `${field}: ${value}`, '자동 복구 시 빈 값 또는 오늘 날짜로 보정합니다.', true);
    });
  });

  data.wrongNotes.forEach((note) => {
    if (note.recallId && !recallIds.has(note.recallId)) issue(issues, 'warning', '연결 문제', 'recallId가 존재하지 않는 오답노트', 'wrongNote', note.id, `recallId ${note.recallId}가 recalls에 없습니다.`, '자동 삭제하지 않습니다. 수동으로 확인해 주세요.', false);
    if (note.conceptId && !conceptIds.has(note.conceptId)) issue(issues, 'warning', '연결 문제', 'conceptId가 존재하지 않는 오답노트', 'wrongNote', note.id, `conceptId ${note.conceptId}가 concepts에 없습니다.`, '자동 삭제하지 않습니다. 수동으로 확인해 주세요.', false);
  });

  data.concepts.forEach((concept) => {
    if (!concept.subject) issue(issues, 'critical', '필수값 문제', 'subject가 없는 concept', 'concept', concept.id, '과목이 비어 있습니다.', '자동 복구 시 미분류로 보정합니다.', true);
    if (!concept.unit) issue(issues, 'warning', '필수값 문제', 'unit이 없는 concept', 'concept', concept.id, '단원/대주제가 비어 있습니다.', '자동 복구 시 미분류로 보정합니다.', true);
    if (!concept.title && !concept.topic) issue(issues, 'critical', '필수값 문제', 'title/topic이 없는 concept', 'concept', concept.id, '주제/소개념명이 없습니다.', '자동 복구 시 제목 없음으로 보정합니다.', true);
    if (!statusOptions.includes(concept.status)) issue(issues, 'warning', '상태값 문제', 'settings.statusOptions에 없는 concept.status', 'concept', concept.id, `현재 상태: ${concept.status || '(없음)'}`, '자동 복구 시 기본 상태로 변경합니다.', true);
    ['summaryNote', 'isFavorite', 'isDeleted'].forEach((field) => {
      if (checkMissingField(concept, field)) issue(issues, 'warning', '누락 필드 문제', `concept.${field} 누락`, 'concept', concept.id, `${field} 필드가 없습니다.`, '자동 복구 시 기본값을 추가합니다.', true);
    });
    ['createdAt', 'updatedAt'].forEach((field) => {
      if (!concept[field as keyof Concept] || !isValidDateString(String(concept[field as keyof Concept]))) issue(issues, 'warning', '날짜 문제', `${field}이 없거나 잘못된 형식`, 'concept', concept.id, `${field}: ${String(concept[field as keyof Concept] || '(없음)')}`, '자동 복구 시 현재 시간으로 보정합니다.', true);
    });
    const connected = data.recalls.filter((recall) => recall.conceptId === concept.id);
    if (connected.length === 0) issue(issues, 'info', '데이터 품질 참고', '문제 없는 소개념', 'concept', concept.id, `${concept.title}에 연결된 문제가 없습니다.`, '학습 구조상 필요하면 문제를 추가해 주세요.', false);
    if (!concept.summaryNote) issue(issues, 'info', '데이터 품질 참고', '요약노트 없는 소개념', 'concept', concept.id, `${concept.title}에 요약노트가 없습니다.`, '필요하면 지식맵 또는 빠른 입력에서 요약노트를 추가해 주세요.', false);
  });

  const questionMap = new Map<string, string[]>();
  data.recalls.forEach((recall) => {
    const key = `${recall.conceptId}::${recall.question.trim()}`;
    if (!recall.question.trim()) return;
    questionMap.set(key, [...(questionMap.get(key) || []), recall.id]);
  });
  questionMap.forEach((ids) => {
    if (ids.length > 1) issue(issues, 'info', '데이터 품질 참고', '중복 문제 후보', 'recall', ids.join(', '), `같은 소개념 안에 같은 문제로 보이는 항목이 ${ids.length}개 있습니다.`, '자동 삭제하지 않습니다. 필요하면 수동으로 정리해 주세요.', false);
  });

  data.recalls.filter((recall) => !recall.conceptId || !conceptIds.has(recall.conceptId)).forEach((recall) => {
    issue(issues, 'info', '데이터 품질 참고', '연결 해제된 문제', 'recall', recall.id, '지식맵에서 정상 위치에 보이지 않을 수 있습니다.', '자동 복구 시 미분류 소개념으로 이동합니다.', true);
  });

  const critical = issues.filter((item) => item.severity === 'critical');
  const warning = issues.filter((item) => item.severity === 'warning');
  const info = issues.filter((item) => item.severity === 'info');
  const autoFixable = issues.filter((item) => item.autoFixable);
  const manualOnly = issues.filter((item) => !item.autoFixable);

  return {
    checkedAt: nowISO(),
    summary: {
      critical: critical.length,
      warning: warning.length,
      info: info.length,
      autoFixable: autoFixable.length,
      manualOnly: manualOnly.length
    },
    issues,
    critical,
    warning,
    info,
    autoFixable,
    manualOnly
  };
}

function ensureUncategorizedConcept(data: KnowledgeData): { data: KnowledgeData; conceptId: string; created: boolean } {
  const existing = data.concepts.find((concept) => concept.subject === '미분류' && concept.unit === '미분류' && concept.title === '연결 해제 문제');
  if (existing) return { data, conceptId: existing.id, created: false };
  const stamp = nowISO();
  const concept: Concept = {
    id: nextId('C', data.concepts),
    subject: '미분류',
    unit: '미분류',
    topic: '미분류',
    title: '연결 해제 문제',
    summaryNote: '연결된 소개념이 없어 자동으로 모인 문제입니다.',
    description: '',
    importance: 1,
    status: data.settings.statusOptions[0] || '미학습',
    keywords: '',
    source: '자동 복구',
    memo: '',
    isFavorite: false,
    isDeleted: false,
    createdAt: stamp,
    updatedAt: stamp
  };
  return {
    data: {
      ...data,
      concepts: [...data.concepts, concept],
      subjects: Array.from(new Set([...data.subjects, '미분류'])),
      topics: Array.from(new Set([...data.topics, '미분류'])),
      settings: { ...data.settings, subjects: Array.from(new Set([...data.settings.subjects, '미분류'])) }
    },
    conceptId: concept.id,
    created: true
  };
}

export function autoRepairData(data: KnowledgeData): AutoRepairResult {
  let next: KnowledgeData = JSON.parse(JSON.stringify(data));
  const messages: string[] = [];
  let fixedCount = 0;
  const stamp = nowISO();
  const today = todayISO();
  const defaultStatus = next.settings.statusOptions[0] || '미학습';

  const conceptIdMap = new Map<string, string>();
  const usedConceptIds = new Set<string>();
  next.concepts = next.concepts.map((concept, index) => {
    let repaired: any = { ...concept };
    if (!repaired.id || usedConceptIds.has(repaired.id)) {
      const oldId = repaired.id;
      repaired.id = nextId('C', [...next.concepts, ...Array.from(usedConceptIds).map((id) => ({ id }))]);
      if (oldId) conceptIdMap.set(oldId, repaired.id);
      fixedCount += 1;
      messages.push(`중복/빈 concept id를 새 id ${repaired.id}로 보정했습니다.`);
    }
    usedConceptIds.add(repaired.id);
    if (!('summaryNote' in repaired)) { repaired.summaryNote = ''; fixedCount += 1; }
    if (!('isFavorite' in repaired)) { repaired.isFavorite = false; fixedCount += 1; }
    if (!('isDeleted' in repaired)) { repaired.isDeleted = false; fixedCount += 1; }
    if (!repaired.subject) { repaired.subject = '미분류'; fixedCount += 1; }
    if (!repaired.unit) { repaired.unit = '미분류'; fixedCount += 1; }
    if (!repaired.title && !repaired.topic) { repaired.title = '제목 없음'; repaired.topic = '제목 없음'; fixedCount += 1; }
    if (!repaired.title) { repaired.title = repaired.topic; fixedCount += 1; }
    if (!repaired.topic) { repaired.topic = repaired.title; fixedCount += 1; }
    if (!next.settings.statusOptions.includes(repaired.status)) { repaired.status = defaultStatus; fixedCount += 1; }
    if (!repaired.createdAt || !isValidDateString(repaired.createdAt)) { repaired.createdAt = stamp; fixedCount += 1; }
    if (!repaired.updatedAt || !isValidDateString(repaired.updatedAt)) { repaired.updatedAt = repaired.createdAt || stamp; fixedCount += 1; }
    return repaired as Concept;
  });

  if (conceptIdMap.size > 0) {
    next.recalls = next.recalls.map((recall) => conceptIdMap.has(recall.conceptId) ? { ...recall, conceptId: conceptIdMap.get(recall.conceptId) || recall.conceptId } : recall);
    next.wrongNotes = next.wrongNotes.map((note) => conceptIdMap.has(note.conceptId) ? { ...note, conceptId: conceptIdMap.get(note.conceptId) || note.conceptId } : note);
  }

  let conceptIds = new Set(next.concepts.map((concept) => concept.id));
  const needsUncategorized = next.recalls.some((recall) => !recall.conceptId || !conceptIds.has(recall.conceptId));
  let uncategorizedId = '';
  if (needsUncategorized) {
    const result = ensureUncategorizedConcept(next);
    next = result.data;
    uncategorizedId = result.conceptId;
    conceptIds = new Set(next.concepts.map((concept) => concept.id));
    if (result.created) { fixedCount += 1; messages.push('미분류 소개념을 생성했습니다.'); }
  }

  const recallIdMap = new Map<string, string>();
  const usedRecallIds = new Set<string>();
  next.recalls = next.recalls.map((recall) => {
    let repaired: any = { ...recall };
    if (!repaired.id || usedRecallIds.has(repaired.id)) {
      const oldId = repaired.id;
      repaired.id = nextId('R', [...next.recalls, ...Array.from(usedRecallIds).map((id) => ({ id }))]);
      if (oldId) recallIdMap.set(oldId, repaired.id);
      fixedCount += 1;
      messages.push(`중복/빈 recall id를 새 id ${repaired.id}로 보정했습니다.`);
    }
    usedRecallIds.add(repaired.id);
    if (!repaired.conceptId || !conceptIds.has(repaired.conceptId)) { repaired.conceptId = uncategorizedId; fixedCount += 1; }
    if (!('isFavorite' in repaired)) { repaired.isFavorite = false; fixedCount += 1; }
    if (!('isDeleted' in repaired)) { repaired.isDeleted = false; fixedCount += 1; }
    if (!('reviewCount' in repaired)) { repaired.reviewCount = 0; fixedCount += 1; }
    if (!('correctStreak' in repaired)) { repaired.correctStreak = 0; fixedCount += 1; }
    if (!('wrongCount' in repaired)) { repaired.wrongCount = 0; fixedCount += 1; }
    if (!next.settings.statusOptions.includes(repaired.status)) { repaired.status = defaultStatus; fixedCount += 1; }
    if (!repaired.createdAt || !isValidDateString(repaired.createdAt)) { repaired.createdAt = stamp; fixedCount += 1; }
    if (!repaired.updatedAt || !isValidDateString(repaired.updatedAt)) { repaired.updatedAt = repaired.createdAt || stamp; fixedCount += 1; }
    if (repaired.lastReviewedAt && !isValidDateString(repaired.lastReviewedAt)) { repaired.lastReviewedAt = ''; fixedCount += 1; }
    if (!repaired.nextReviewAt || !isValidDateString(repaired.nextReviewAt)) { repaired.nextReviewAt = today; fixedCount += 1; }
    return repaired as Recall;
  });

  const usedWrongNoteIds = new Set<string>();
  next.wrongNotes = next.wrongNotes.map((note) => {
    let repaired: any = { ...note };
    if (!repaired.id || usedWrongNoteIds.has(repaired.id)) {
      repaired.id = nextId('W', [...next.wrongNotes, ...Array.from(usedWrongNoteIds).map((id) => ({ id }))]);
      fixedCount += 1;
      messages.push(`중복/빈 wrongNote id를 새 id ${repaired.id}로 보정했습니다.`);
    }
    usedWrongNoteIds.add(repaired.id);
    if (recallIdMap.has(repaired.recallId)) { repaired.recallId = recallIdMap.get(repaired.recallId); fixedCount += 1; }
    if (conceptIdMap.has(repaired.conceptId)) { repaired.conceptId = conceptIdMap.get(repaired.conceptId); fixedCount += 1; }
    if (!repaired.createdAt || !isValidDateString(repaired.createdAt)) { repaired.createdAt = stamp; fixedCount += 1; }
    if (!repaired.updatedAt || !isValidDateString(repaired.updatedAt)) { repaired.updatedAt = repaired.createdAt || stamp; fixedCount += 1; }
    if (!('wrongCount' in repaired)) { repaired.wrongCount = 1; fixedCount += 1; }
    return repaired as WrongNote;
  });

  next.subjects = Array.from(new Set([...next.subjects, ...next.concepts.map((concept) => concept.subject)].filter(Boolean)));
  next.topics = Array.from(new Set([...next.topics, ...next.concepts.map((concept) => concept.topic)].filter(Boolean)));
  next.settings.subjects = Array.from(new Set([...next.settings.subjects, ...next.subjects].filter(Boolean)));
  next.version = 6.5;
  if (fixedCount === 0) messages.push('자동으로 복구할 항목이 없습니다.');
  return { data: next, fixedCount, messages };
}

export function downloadDataCheckResult(result: DataCheckResult): void {
  const d = new Date(result.checkedAt);
  const stamp = Number.isNaN(d.getTime())
    ? 'unknown'
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  downloadJson(result as any, `data_check_result_${stamp}.json`);
}
