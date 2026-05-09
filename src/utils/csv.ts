import type { Concept, KnowledgeData, Recall } from '../types';
import { nowISO, todayISO } from './date';
import { nextId } from './ids';

export const CSV_HEADERS = ['id','과목','단원','주제','앞면(문제)','뒷면(답)-키워드','요약노트','해설','출처','기출여부','중요도','문제유형','난이도'];

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export const CSV_TEMPLATE = `${CSV_HEADERS.join(',')}\n${[
  'R-100',
  '체육측정평가',
  '규준지향 검사의 타당도와 신뢰도',
  '고전진점수 이론',
  '고전진점수이론의 기본식은?',
  'X = T + E',
  '고전진점수 이론\n\n- 관찰점수는 진점수와 오차점수의 합이다.\n- 오차점수의 평균은 0이다.',
  '관찰점수는 진점수와 오차점수의 합이다.',
  '기본서',
  '아니오',
  '5',
  '단답형',
  '2'
].map(csvCell).join(',')}\n${[
  'R-101',
  '체육측정평가',
  '규준지향 검사의 타당도와 신뢰도',
  '고전진점수 이론',
  '오차점수의 평균은?',
  '0',
  '',
  '',
  '기본서',
  '아니오',
  '5',
  '단답형',
  '2'
].map(csvCell).join(',')}`;

export function downloadCsvTemplate(): void {
  const blob = new Blob(['\ufeff' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '체육임용_지식맵_CSV_양식.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.map((v) => v.trim());
}

export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    const next = clean[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
      current += char;
    } else if (char === '\n' && !quoted) {
      if (current.trim()) lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

export function validateCsvRows(rows: Record<string, string>[]): string[] {
  const warnings: string[] = [];
  const required = ['과목','단원','주제','앞면(문제)','뒷면(답)-키워드'];
  required.forEach((header) => {
    if (rows.length > 0 && !(header in rows[0])) warnings.push(`필수 컬럼이 없습니다: ${header}`);
  });
  rows.forEach((row, index) => {
    if (!row['과목'] || !row['단원'] || !row['주제'] || !row['앞면(문제)'] || !row['뒷면(답)-키워드']) {
      warnings.push(`${index + 2}행: 과목/단원/주제/앞면(문제)/뒷면(답)-키워드 중 비어 있는 값이 있습니다.`);
    }
  });
  return warnings;
}

function findOrCreateConcept(data: KnowledgeData, subject: string, unit: string, title: string, summaryNote: string): { concept: Concept; created: boolean } {
  const existing = data.concepts.find((c) => c.subject === subject && c.unit === unit && c.title === title);
  if (existing) {
    if (summaryNote && !existing.summaryNote) existing.summaryNote = summaryNote;
    return { concept: existing, created: false };
  }
  const stamp = nowISO();
  const concept: Concept = {
    id: nextId('C', data.concepts),
    subject,
    unit,
    topic: title,
    title,
    summaryNote,
    description: '',
    importance: 3,
    status: data.settings.statusOptions[0] || '미학습',
    keywords: '',
    source: '',
    memo: '',
    isFavorite: false,
    isDeleted: false,
    createdAt: stamp,
    updatedAt: stamp
  };
  data.concepts.push(concept);
  return { concept, created: true };
}

export function importCsvRows(data: KnowledgeData, rows: Record<string, string>[]): { data: KnowledgeData; saved: number; warnings: string[] } {
  const next: KnowledgeData = JSON.parse(JSON.stringify(data));
  const warnings: string[] = validateCsvRows(rows);
  if (warnings.some((w) => w.includes('필수 컬럼'))) return { data, saved: 0, warnings };
  let saved = 0;
  rows.forEach((row, index) => {
    const subject = row['과목']?.trim();
    const unit = row['단원']?.trim();
    const title = row['주제']?.trim();
    const question = row['앞면(문제)'] ?? '';
    const answer = row['뒷면(답)-키워드'] ?? '';
    const summaryNote = row['요약노트'] ?? '';
    if (!subject || !unit || !title || !question || !answer) return;
    const { concept } = findOrCreateConcept(next, subject, unit, title, summaryNote);
    const duplicate = next.recalls.some((r) => r.conceptId === concept.id && r.question.trim() === question.trim());
    if (duplicate) {
      warnings.push(`${index + 2}행: 이미 같은 주제/소개념 아래 동일한 문제가 있어 건너뛰었습니다.`);
      return;
    }
    const stamp = nowISO();
    const recall: Recall = {
      id: row['id']?.trim() && !next.recalls.some((r) => r.id === row['id'].trim()) ? row['id'].trim() : nextId('R', next.recalls),
      conceptId: concept.id,
      question,
      answer,
      explanation: row['해설'] || '',
      source: row['출처'] || '',
      keywords: row['키워드'] || '',
      importance: Number(row['중요도'] || 3),
      type: row['문제유형'] || '단답형',
      difficulty: Number(row['난이도'] || 2),
      isPastExam: row['기출여부'] || '',
      status: next.settings.statusOptions[0] || '미학습',
      isFavorite: false,
      isDeleted: false,
      reviewCount: 0,
      correctStreak: 0,
      wrongCount: 0,
      lastReviewedAt: '',
      nextReviewAt: todayISO(),
      createdAt: stamp,
      updatedAt: stamp
    };
    next.recalls.push(recall);
    next.subjects = Array.from(new Set([...next.subjects, subject]));
    next.topics = Array.from(new Set([...next.topics, title]));
    next.settings.subjects = Array.from(new Set([...next.settings.subjects, subject]));
    saved += 1;
  });
  return { data: next, saved, warnings };
}
