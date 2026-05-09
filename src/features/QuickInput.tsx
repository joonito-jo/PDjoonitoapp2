import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Concept, KnowledgeData, ProblemBlock } from '../types';
import { Button, Card, Badge } from '../components/ui';
import { Field, SelectField } from '../components/Form';
import { SectionTitle } from '../components/Common';
import { nextId, uniqueId } from '../utils/ids';
import { nowISO, todayISO } from '../utils/date';

const blankBlock = (): ProblemBlock => ({
  localId: uniqueId('block'),
  question: '',
  answer: '',
  explanation: '',
  source: '',
  keywords: '',
  importance: 3,
  type: '단답형',
  difficulty: 2,
  isPastExam: '',
  memo: ''
});

type Props = {
  data: KnowledgeData;
  setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void;
  toast: (m: string, t?: 'success' | 'error' | 'info') => void;
  goMap: (conceptId: string) => void;
};

export function QuickInput({ data, setData, toast, goMap }: Props) {
  const [subject, setSubject] = useState(data.settings.recentInput.subject || '');
  const [unit, setUnit] = useState(data.settings.recentInput.unit || '');
  const [topic, setTopic] = useState(data.settings.recentInput.topic || '');
  const [conceptId, setConceptId] = useState(data.settings.recentInput.conceptId || '');
  const [summaryNote, setSummaryNote] = useState(data.concepts.find((c) => c.id === data.settings.recentInput.conceptId)?.summaryNote || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [blocks, setBlocks] = useState<ProblemBlock[]>([blankBlock(), blankBlock(), blankBlock()]);
  const [recentSaved, setRecentSaved] = useState<string[]>([]);

  const subjects = useMemo(() => Array.from(new Set([...data.settings.subjects, ...data.subjects, ...data.concepts.map((c) => c.subject)].filter(Boolean))), [data]);
  const units = useMemo(() => Array.from(new Set(data.concepts.filter((c) => !subject || c.subject === subject).map((c) => c.unit).filter(Boolean))), [data.concepts, subject]);
  const concepts = useMemo(() => data.concepts.filter((c) => c.subject === subject && c.unit === unit), [data.concepts, subject, unit]);
  const selectedConcept = data.concepts.find((c) => c.id === conceptId);

  function addBlock() { setBlocks((prev) => [...prev, blankBlock()]); }
  function removeBlock(localId: string) { setBlocks((prev) => prev.length <= 1 ? prev : prev.filter((b) => b.localId !== localId)); }
  function updateBlock(localId: string, patch: Partial<ProblemBlock>) { setBlocks((prev) => prev.map((b) => b.localId === localId ? { ...b, ...patch } : b)); }
  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function resetBlocks() { setBlocks([blankBlock(), blankBlock(), blankBlock()]); }
  function fullReset() { setSubject(''); setUnit(''); setTopic(''); setConceptId(''); setSummaryNote(''); resetBlocks(); }

  function chooseConcept(id: string) {
    setConceptId(id);
    const concept = data.concepts.find((c) => c.id === id);
    if (concept) {
      setTopic(concept.title);
      setSummaryNote(concept.summaryNote || '');
    }
  }

  function ensureConcept(prev: KnowledgeData): { next: KnowledgeData; concept: Concept } | null {
    const cleanSubject = subject.trim();
    const cleanUnit = unit.trim();
    const cleanTitle = topic.trim();
    if (!cleanSubject || !cleanUnit || !cleanTitle) return null;
    const existing = prev.concepts.find((c) => c.id === conceptId);
    if (existing) {
      const updatedExisting = { ...existing, summaryNote, updatedAt: nowISO() };
      return {
        next: { ...prev, concepts: prev.concepts.map((c) => c.id === existing.id ? updatedExisting : c) },
        concept: updatedExisting
      };
    }
    const same = prev.concepts.find((c) => c.subject === cleanSubject && c.unit === cleanUnit && c.title === cleanTitle);
    if (same) {
      const patched = summaryNote && summaryNote !== same.summaryNote ? { ...same, summaryNote, updatedAt: nowISO() } : same;
      return { next: { ...prev, concepts: prev.concepts.map((c) => c.id === patched.id ? patched : c) }, concept: patched };
    }
    const stamp = nowISO();
    const concept: Concept = {
      id: nextId('C', prev.concepts),
      subject: cleanSubject,
      unit: cleanUnit,
      topic: cleanTitle,
      title: cleanTitle,
      summaryNote,
      description: '',
      importance: 3,
      status: prev.settings.statusOptions[0] || '미학습',
      keywords: '',
      source: '',
      memo: '',
      isFavorite: false,
      isDeleted: false,
      createdAt: stamp,
      updatedAt: stamp
    };
    return { next: { ...prev, concepts: [...prev.concepts, concept] }, concept };
  }

  function saveBlocks(clearAll: boolean) {
    const valid = blocks.filter((b) => b.question.trim() && b.answer.trim());
    const partial = blocks.filter((b) => (b.question.trim() && !b.answer.trim()) || (!b.question.trim() && b.answer.trim()));
    if (!subject.trim() || !unit.trim() || !topic.trim()) { toast('과목, 단원/대주제, 주제/소개념을 먼저 입력해줘.', 'error'); return; }
    if (partial.length > 0) { toast('문제와 정답 중 하나만 입력된 블록이 있어. 해당 블록을 완성하거나 비워줘.', 'error'); return; }
    if (valid.length === 0) { toast('저장할 문제가 없어.', 'error'); return; }
    const questions = valid.map((b) => b.question.trim());
    if (new Set(questions).size !== questions.length) { toast('입력한 문제 블록 안에 중복 문제가 있어.', 'error'); return; }

    let savedConceptId = '';
    let savedConceptTitle = topic.trim();
    const savedIds: string[] = [];
    setData((prev) => {
      const result = ensureConcept(prev);
      if (!result) return prev;
      let next = result.next;
      const concept = result.concept;
      savedConceptId = concept.id;
      savedConceptTitle = concept.title;
      const duplicate = valid.find((b) => next.recalls.some((r) => r.conceptId === concept.id && r.question.trim() === b.question.trim()));
      if (duplicate) {
        toast('같은 주제/소개념 안에 이미 같은 문제가 있어 저장하지 않았어.', 'error');
        return prev;
      }
      const stamp = nowISO();
      const newRecalls = valid.map((b) => {
        const id = nextId('R', [...next.recalls, ...savedIds.map((id) => ({ id }))]);
        savedIds.push(id);
        return {
          id,
          conceptId: concept.id,
          question: b.question,
          answer: b.answer,
          explanation: b.explanation,
          source: b.source,
          keywords: b.keywords,
          importance: Number(b.importance || 3),
          type: b.type || '단답형',
          difficulty: Number(b.difficulty || 2),
          isPastExam: b.isPastExam || '',
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
      });
      next = {
        ...next,
        subjects: Array.from(new Set([...next.subjects, subject.trim()])),
        topics: Array.from(new Set([...next.topics, topic.trim()])),
        recalls: [...next.recalls, ...newRecalls],
        settings: {
          ...next.settings,
          subjects: Array.from(new Set([...next.settings.subjects, subject.trim()])),
          recentInput: { subject: subject.trim(), unit: unit.trim(), topic: topic.trim(), conceptId: concept.id }
        }
      };
      return next;
    });
    if (savedConceptId) {
      setConceptId(savedConceptId);
      setTopic(savedConceptTitle);
      setRecentSaved(savedIds);
      toast(`${savedConceptTitle || '주제/소개념'}에 문제 ${valid.length}개를 저장했어요.`);
      if (clearAll) fullReset(); else resetBlocks();
    }
  }

  return (
    <div>
      <SectionTitle title="빠른 입력" subtitle="과목, 단원/대주제, 주제/소개념 아래에 여러 인출문제를 한 번에 추가해요." />
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-4">
          <h3 className="mb-4 text-lg font-black">분류 선택</h3>
          <div className="space-y-3">
            <SelectField label="과목" value={subject} onChange={(v) => { setSubject(v); setUnit(''); setTopic(''); setConceptId(''); }}>
              <option value="">과목 선택</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            <Field label="새 과목 바로 입력" value={subject} onChange={(v) => { setSubject(v); setUnit(''); setTopic(''); setConceptId(''); }} placeholder="예: 체육측정평가" />
            <SelectField label="단원/대주제" value={unit} onChange={(v) => { setUnit(v); setTopic(''); setConceptId(''); }}>
              <option value="">단원/대주제 선택</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </SelectField>
            <Field label="새 단원/대주제 바로 입력" value={unit} onChange={(v) => { setUnit(v); setTopic(''); setConceptId(''); }} placeholder="예: 규준지향 검사의 타당도와 신뢰도" />
            <SelectField label="주제/소개념" value={conceptId} onChange={chooseConcept}>
              <option value="">새 주제/소개념 만들기</option>
              {concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </SelectField>
            {!conceptId && <Field label="새 주제/소개념" value={topic} onChange={setTopic} placeholder="예: 고전진점수 이론" />}
            {conceptId && <Field label="주제/소개념명" value={topic} onChange={setTopic} placeholder="예: 고전진점수 이론" />}
            <Field label="요약노트" value={summaryNote} onChange={setSummaryNote} textarea rows={10} inputClassName="border-amber-200 bg-amber-50/70 leading-7 focus:border-amber-400" placeholder={'블로그 글처럼 길게 써도 좋아요.\n\n- 줄바꿈 보존\n- 하이픈 목록 보존\n1. 번호 목록도 보존'} />
          </div>
          <div className="mt-5 rounded-3xl bg-zinc-50 p-4">
            <p className="font-black">연결될 구조</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{subject || '과목'} → {unit || '단원/대주제'} → {topic || '주제/소개념'} → 문제 {blocks.filter((b) => b.question.trim() && b.answer.trim()).length}개</p>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black">인출문제 입력</h3>
            <Button variant="outline" onClick={() => setShowAdvanced((v) => !v)}>{showAdvanced ? <ChevronDown size={16} className="mr-2" /> : <ChevronRight size={16} className="mr-2" />}고급 옵션</Button>
          </div>
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div key={block.localId} className="rounded-3xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Badge tone="dark">문제 {index + 1}</Badge></div>
                  <div className="flex gap-1">
                    <button onClick={() => moveBlock(index, -1)} className="rounded-xl p-2 hover:bg-zinc-100"><ArrowUp size={16} /></button>
                    <button onClick={() => moveBlock(index, 1)} className="rounded-xl p-2 hover:bg-zinc-100"><ArrowDown size={16} /></button>
                    <button onClick={() => removeBlock(block.localId)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Field label="앞면(문제)" value={block.question} onChange={(v) => updateBlock(block.localId, { question: v })} textarea placeholder="문제 원문을 그대로 입력" />
                  <Field label="뒷면(답)-키워드" value={block.answer} onChange={(v) => updateBlock(block.localId, { answer: v })} textarea placeholder="정답 원문을 그대로 입력" />
                  {showAdvanced && (
                    <div className="grid gap-3 rounded-3xl bg-zinc-50 p-4 sm:grid-cols-2">
                      <Field label="해설" value={block.explanation} onChange={(v) => updateBlock(block.localId, { explanation: v })} textarea />
                      <Field label="키워드" value={block.keywords} onChange={(v) => updateBlock(block.localId, { keywords: v })} />
                      <Field label="출처" value={block.source} onChange={(v) => updateBlock(block.localId, { source: v })} />
                      <Field label="기출여부" value={block.isPastExam} onChange={(v) => updateBlock(block.localId, { isPastExam: v })} placeholder="예: 예 / 아니오 / 2024" />
                      <Field label="문제 유형" value={block.type} onChange={(v) => updateBlock(block.localId, { type: v })} />
                      <Field label="중요도" type="number" value={block.importance} onChange={(v) => updateBlock(block.localId, { importance: Number(v) })} />
                      <Field label="난이도" type="number" value={block.difficulty} onChange={(v) => updateBlock(block.localId, { difficulty: Number(v) })} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={addBlock}><Plus className="mr-2" size={16} />문제 추가</Button>
            <Button onClick={() => saveBlocks(false)}><Save className="mr-2" size={16} />저장하고 같은 주제/소개념으로 계속 입력</Button>
            <Button variant="outline" onClick={() => saveBlocks(true)}>저장 후 전체 초기화</Button>
          </div>
          {recentSaved.length > 0 && (
            <div className="mt-5 rounded-3xl bg-emerald-50 p-4">
              <p className="font-black text-emerald-800">최근 저장한 문제</p>
              <div className="mt-2 flex flex-wrap gap-2">{recentSaved.map((id) => <Badge key={id} tone="green">{id}</Badge>)}</div>
              <Button className="mt-3" variant="outline" onClick={() => conceptId && goMap(conceptId)}>지식맵에서 보기</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
