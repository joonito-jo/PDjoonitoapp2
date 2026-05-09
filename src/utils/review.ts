import type { Recall, ReviewIntervals, Settings, WrongNote } from '../types';
import { addDaysISO, nowISO, todayISO } from './date';

function pickStudyStatus(settings: Settings): string {
  return settings.statusOptions.find((s) => s.includes('학습') || s.includes('진행')) || settings.statusOptions[0] || '미학습';
}

function pickDoneStatus(settings: Settings): string {
  return settings.statusOptions.find((s) => s.includes('완료') || s.includes('암기')) || settings.statusOptions[settings.statusOptions.length - 1] || '암기완료';
}

export function nextReviewDays(correct: boolean, nextStreak: number, importance: number, intervals: ReviewIntervals): number {
  if (!correct) return Math.max(0, Number(intervals.wrong || 1));
  let days = intervals.firstCorrect;
  if (nextStreak === 2) days = intervals.secondCorrect;
  if (nextStreak === 3) days = intervals.thirdCorrect;
  if (nextStreak >= 4) days = intervals.fourthCorrect;
  if (importance >= 5) days = Math.max(1, Math.ceil(days * intervals.highImportanceModifier));
  return days;
}

export function applyRecallReview(recall: Recall, correct: boolean, settings: Settings): Recall {
  const nextStreak = correct ? recall.correctStreak + 1 : 0;
  const days = nextReviewDays(correct, nextStreak, recall.importance, settings.reviewIntervals);
  return {
    ...recall,
    status: correct && nextStreak >= 3 ? pickDoneStatus(settings) : pickStudyStatus(settings),
    reviewCount: recall.reviewCount + 1,
    correctStreak: nextStreak,
    wrongCount: recall.wrongCount + (correct ? 0 : 1),
    lastReviewedAt: todayISO(),
    nextReviewAt: addDaysISO(days),
    updatedAt: nowISO()
  };
}

export function makeWrongNote(recall: Recall, userAnswer = ''): WrongNote {
  const stamp = nowISO();
  return {
    id: `W-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recallId: recall.id,
    conceptId: recall.conceptId,
    question: recall.question,
    answer: recall.answer,
    userAnswer,
    memo: '',
    wrongCount: 1,
    createdAt: stamp,
    updatedAt: stamp
  };
}
