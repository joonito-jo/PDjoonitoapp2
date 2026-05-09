import type { KnowledgeData, Settings } from '../types';
import { nowISO, todayISO } from '../utils/date';

export const defaultSettings: Settings = {
  appName: '체육임용 지식맵',
  subtitle: '과목 → 단원/대주제 → 주제/소개념 → 인출문제',
  statusOptions: ['미학습', '학습중', '암기완료'],
  reviewIntervals: {
    firstCorrect: 1,
    secondCorrect: 3,
    thirdCorrect: 7,
    fourthCorrect: 14,
    wrong: 1,
    highImportanceModifier: 0.8
  },
  recentInput: {
    subject: '체육측정평가',
    unit: '규준지향 검사의 타당도와 신뢰도',
    topic: '고전진점수 이론',
    conceptId: 'C-1'
  },
  recentItems: [],
  subjects: ['체육측정평가']
};

const createdAt = nowISO();

export const initialData: KnowledgeData = {
  version: 6.5,
  settings: defaultSettings,
  subjects: ['체육측정평가'],
  topics: ['고전진점수 이론'],
  concepts: [
    {
      id: 'C-1',
      subject: '체육측정평가',
      unit: '규준지향 검사의 타당도와 신뢰도',
      topic: '고전진점수 이론',
      title: '고전진점수 이론',
      summaryNote: '고전진점수 이론\n\n- 관찰점수 X는 진점수 T와 오차점수 E의 합이다.\n- 오차점수의 평균은 0이다.\n- 진점수와 오차점수의 상관은 0이다.',
      description: '관찰점수는 진점수와 오차점수의 합으로 설명된다는 측정 이론의 기본 개념이다.',
      importance: 5,
      status: '미학습',
      keywords: '관찰점수, 진점수, 오차점수, 신뢰도',
      source: '샘플 데이터',
      memo: '샘플 소개념입니다. 필요하면 설정에서 전체 초기화 후 새로 시작하세요.',
      isFavorite: false,
      isDeleted: false,
      createdAt,
      updatedAt: createdAt
    }
  ],
  recalls: [
    {
      id: 'R-1',
      conceptId: 'C-1',
      question: '고전진점수이론의 기본식은?',
      answer: 'X = T + E',
      explanation: '관찰점수 X는 진점수 T와 오차점수 E의 합으로 표현된다.',
      source: '샘플 데이터',
      keywords: '고전진점수이론, 진점수, 오차점수',
      importance: 5,
      type: '단답형',
      difficulty: 2,
      isPastExam: '아니오',
      status: '미학습',
      isFavorite: false,
      isDeleted: false,
      reviewCount: 0,
      correctStreak: 0,
      wrongCount: 0,
      lastReviewedAt: '',
      nextReviewAt: todayISO(),
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'R-2',
      conceptId: 'C-1',
      question: '오차점수의 평균은?',
      answer: '0',
      explanation: '',
      source: '샘플 데이터',
      keywords: '오차점수 평균',
      importance: 5,
      type: '단답형',
      difficulty: 2,
      isPastExam: '아니오',
      status: '미학습',
      isFavorite: false,
      isDeleted: false,
      reviewCount: 0,
      correctStreak: 0,
      wrongCount: 0,
      lastReviewedAt: '',
      nextReviewAt: todayISO(),
      createdAt,
      updatedAt: createdAt
    }
  ],
  wrongNotes: [],
  reviewLogs: []
};

export function emptyData(): KnowledgeData {
  return {
    version: 6.5,
    settings: { ...defaultSettings, recentInput: { subject: '', unit: '', topic: '', conceptId: '' }, recentItems: [], subjects: [] },
    subjects: [],
    topics: [],
    concepts: [],
    recalls: [],
    wrongNotes: [],
    reviewLogs: []
  };
}
