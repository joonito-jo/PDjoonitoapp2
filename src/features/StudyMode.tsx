import { Check, Eye, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { KnowledgeData, Recall } from '../types';
import { Button, Card, Badge } from '../components/ui';
import { EmptyState, SectionTitle, SummaryNoteBox } from '../components/Common';
import { applyRecallReview, makeWrongNote } from '../utils/review';
import { isDue, nowISO } from '../utils/date';

export function StudyMode({ data, setData, toast, initialConceptId }: { data: KnowledgeData; setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void; toast: (m: string, t?: 'success' | 'error' | 'info') => void; initialConceptId: string }) {
  const [level, setLevel] = useState<'subjects' | 'units' | 'concepts' | 'intro' | 'study'>(initialConceptId ? 'intro' : 'subjects');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [conceptId, setConceptId] = useState(initialConceptId);
  const [queue, setQueue] = useState<Recall[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (initialConceptId) {
      setConceptId(initialConceptId);
      setLevel('intro');
      const concept = data.concepts.find((c) => c.id === initialConceptId);
      if (concept) {
        setSubject(concept.subject);
        setUnit(concept.unit);
      }
    }
  }, [initialConceptId]);

  const subjects = useMemo(() => Array.from(new Set(data.concepts.map((c) => c.subject).filter(Boolean))), [data.concepts]);
  const units = useMemo(() => Array.from(new Set(data.concepts.filter((c) => c.subject === subject).map((c) => c.unit).filter(Boolean))), [data.concepts, subject]);
  const concepts = useMemo(() => data.concepts.filter((c) => c.subject === subject && c.unit === unit), [data.concepts, subject, unit]);
  const selectedConcept = data.concepts.find((c) => c.id === conceptId);

  function conceptTitle(id: string) { return data.concepts.find((c) => c.id === id)?.title || '연결 해제'; }
  function recallsForConcept(id: string) { return data.recalls.filter((r) => r.conceptId === id); }

  function startWithRecalls(recalls: Recall[]) {
    if (recalls.length === 0) { toast('학습할 문제가 없어요.', 'error'); return; }
    setQueue(recalls);
    setIndex(0);
    setShowAnswer(false);
    setLevel('study');
  }

  function chooseConcept(id: string) {
    setConceptId(id);
    setLevel('intro');
  }

  function startSelectedConcept() {
    if (!conceptId) return;
    startWithRecalls(recallsForConcept(conceptId));
  }

  function quick(kind: 'due' | 'new' | 'wrong' | 'important') {
    if (kind === 'due') startWithRecalls(data.recalls.filter((r) => isDue(r.nextReviewAt)));
    if (kind === 'new') startWithRecalls(data.recalls.filter((r) => r.reviewCount === 0));
    if (kind === 'wrong') startWithRecalls(data.recalls.filter((r) => r.wrongCount > 0));
    if (kind === 'important') startWithRecalls(data.recalls.filter((r) => r.importance >= 5));
  }

  function record(result: 'correct' | 'wrong') {
    const current = queue[index];
    if (!current) return;
    setData((prev) => {
      const fresh = prev.recalls.find((r) => r.id === current.id) || current;
      const updated = applyRecallReview(fresh, result === 'correct', prev.settings);
      const wrongNotes = result === 'wrong' ? [makeWrongNote(updated), ...prev.wrongNotes] : prev.wrongNotes;
      return {
        ...prev,
        recalls: prev.recalls.map((r) => r.id === updated.id ? updated : r),
        wrongNotes,
        reviewLogs: [{ id: `L-${Date.now()}`, recallId: updated.id, conceptId: updated.conceptId, result, createdAt: nowISO() }, ...prev.reviewLogs]
      };
    });
    toast(result === 'correct' ? '맞힘으로 기록했어요.' : '틀림으로 기록하고 오답노트에 저장했어요.');
    setShowAnswer(false);
    setIndex((i) => Math.min(i + 1, queue.length));
  }

  const active = queue[index];

  return (
    <div>
      <SectionTitle title="학습모드" subtitle="과목 → 단원/대주제 → 주제/소개념 → 요약노트 → 문제 순서로 들어가며 학습해요." />
      <div className="mb-5 grid gap-2 sm:grid-cols-4"><Button variant="outline" onClick={()=>quick('due')}>오늘 복습 바로 시작</Button><Button variant="outline" onClick={()=>quick('new')}>미학습 문제</Button><Button variant="outline" onClick={()=>quick('wrong')}>틀린 문제만</Button><Button variant="outline" onClick={()=>quick('important')}>중요도 높은 문제</Button></div>
      {level === 'subjects' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subjects.map((s)=>{ const ids=data.concepts.filter(c=>c.subject===s).map(c=>c.id); const rs=data.recalls.filter(r=>ids.includes(r.conceptId)); return <Card key={s} className="p-5"><button className="w-full text-left" onClick={()=>{setSubject(s);setLevel('units')}}><h3 className="text-xl font-black">{s}</h3><div className="mt-4 flex flex-wrap gap-2"><Badge>전체 {rs.length}</Badge><Badge tone="red">복습 {rs.filter(r=>isDue(r.nextReviewAt)).length}</Badge><Badge>미학습 {rs.filter(r=>r.reviewCount===0).length}</Badge><Badge tone="green">완료 {rs.filter(r=>r.correctStreak>=3).length}</Badge></div></button></Card>})}</div>}
      {level === 'units' && <div><Button variant="ghost" onClick={()=>setLevel('subjects')}>← 과목 목록</Button><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{units.map((u)=>{ const ids=data.concepts.filter(c=>c.subject===subject&&c.unit===u).map(c=>c.id); const rs=data.recalls.filter(r=>ids.includes(r.conceptId)); return <Card key={u} className="p-5"><button className="w-full text-left" onClick={()=>{setUnit(u);setLevel('concepts')}}><h3 className="text-lg font-black">{u}</h3><div className="mt-4 flex flex-wrap gap-2"><Badge>문제 {rs.length}</Badge><Badge tone="red">복습 {rs.filter(r=>isDue(r.nextReviewAt)).length}</Badge></div></button></Card>})}</div></div>}
      {level === 'concepts' && <div><Button variant="ghost" onClick={()=>setLevel('units')}>← 단원/대주제 목록</Button><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{concepts.map((c)=>{ const rs=recallsForConcept(c.id); return <Card key={c.id} className="p-5"><button className="w-full text-left" onClick={()=>chooseConcept(c.id)}><h3 className="text-lg font-black">{c.title}</h3><p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-zinc-500">{c.summaryNote || '아직 요약노트가 없습니다'}</p><div className="mt-4 flex flex-wrap gap-2"><Badge>문제 {rs.length}</Badge><Badge tone="red">복습 {rs.filter(r=>isDue(r.nextReviewAt)).length}</Badge><Badge>{c.status}</Badge></div></button></Card>})}</div></div>}
      {level === 'intro' && selectedConcept && <div><Button variant="ghost" onClick={()=>setLevel('concepts')}>← 주제/소개념 목록</Button><Card className="mt-4 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-zinc-500">{selectedConcept.subject} &gt; {selectedConcept.unit}</p><h3 className="mt-1 text-2xl font-black">{selectedConcept.title}</h3></div><Badge tone="blue">문제 {recallsForConcept(selectedConcept.id).length}개</Badge></div><div className="mt-5"><SummaryNoteBox note={selectedConcept.summaryNote} /></div><div className="mt-5 flex flex-wrap gap-2"><Button onClick={startSelectedConcept}>문제 학습 시작</Button><Button variant="outline" onClick={()=>setLevel('subjects')}>과목 목록으로</Button></div></Card></div>}
      {level === 'study' && <div>{!active ? <Card className="p-8 text-center"><p className="text-xl font-black">학습 완료</p><p className="mt-2 text-sm text-zinc-500">선택한 문제를 모두 확인했어요.</p><Button className="mt-4" onClick={()=>setLevel('subjects')}><RotateCcw size={16} className="mr-2"/>과목 목록으로</Button></Card> : <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><Badge tone="dark">{index+1} / {queue.length}</Badge><Badge tone="blue"> {conceptTitle(active.conceptId)}</Badge></div><p className="text-sm font-bold text-zinc-500">진행률 {Math.round((index/queue.length)*100)}%</p></div><p className="mt-6 whitespace-pre-wrap text-xl font-black leading-9">{active.question}</p>{showAnswer && <div className="mt-5 rounded-3xl bg-zinc-50 p-5"><p className="text-xs font-bold text-zinc-500">정답</p><p className="mt-2 whitespace-pre-wrap text-base leading-7">{active.answer}</p>{active.explanation && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-500">해설: {active.explanation}</p>}</div>}<div className="mt-6 flex flex-wrap gap-2"><Button onClick={()=>setShowAnswer(v=>!v)}><Eye size={16} className="mr-2"/>정답 보기</Button><Button variant="outline" onClick={()=>record('correct')}><Check size={16} className="mr-2"/>맞힘</Button><Button variant="outline" onClick={()=>record('wrong')}><X size={16} className="mr-2"/>틀림</Button><Button variant="ghost" onClick={()=>{setIndex(i=>Math.min(i+1,queue.length));setShowAnswer(false)}}>다음 문제</Button></div></Card>}</div>}
      {data.concepts.length===0 && <EmptyState title="학습할 데이터가 없어요" description="빠른 입력에서 먼저 문제를 추가해 주세요."/>}
    </div>
  );
}
