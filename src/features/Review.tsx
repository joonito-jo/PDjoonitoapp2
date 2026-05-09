import { Check, Eye, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { KnowledgeData, Recall } from '../types';
import { Button, Card, Badge } from '../components/ui';
import { EmptyState, SectionTitle } from '../components/Common';
import { applyRecallReview, makeWrongNote } from '../utils/review';
import { isDue, nowISO } from '../utils/date';

export function Review({ data, setData, toast }: { data: KnowledgeData; setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void; toast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const [show, setShow] = useState<Record<string, boolean>>({});
  const due = useMemo(() => data.recalls.filter((r) => isDue(r.nextReviewAt)), [data.recalls]);
  const grouped = useMemo(() => {
    const map = new Map<string, Recall[]>();
    due.forEach((r) => {
      const c = data.concepts.find((x) => x.id === r.conceptId);
      const key = `${c?.subject || '미분류'} > ${c?.unit || '미분류'}`;
      map.set(key, [...(map.get(key) || []), r]);
    });
    return Array.from(map.entries());
  }, [due, data.concepts]);

  function record(recall: Recall, result: 'correct' | 'wrong') {
    setData((prev) => {
      const fresh = prev.recalls.find((r) => r.id === recall.id) || recall;
      const updated = applyRecallReview(fresh, result === 'correct', prev.settings);
      return {
        ...prev,
        recalls: prev.recalls.map((r) => r.id === updated.id ? updated : r),
        wrongNotes: result === 'wrong' ? [makeWrongNote(updated), ...prev.wrongNotes] : prev.wrongNotes,
        reviewLogs: [{ id: `L-${Date.now()}`, recallId: updated.id, conceptId: updated.conceptId, result, createdAt: nowISO() }, ...prev.reviewLogs]
      };
    });
    toast(result === 'correct' ? '복습 맞힘 기록 완료' : '오답노트에 저장했어요.');
  }

  return <div><SectionTitle title="복습" subtitle="오늘 다시 볼 문제를 과목과 단원/대주제별로 모아 보여줘요." />
    <Card className="mb-5 p-5"><p className="text-3xl font-black">오늘 복습할 문제 {due.length}개</p></Card>
    {due.length === 0 ? <EmptyState title="오늘 복습할 문제가 없어요" description="학습 기록이 쌓이면 다음 복습일에 맞춰 이곳에 나타나요." /> : <div className="space-y-5">{grouped.map(([group, items]) => <Card key={group} className="p-5"><h3 className="text-lg font-black">{group}</h3><div className="mt-4 space-y-3">{items.map((r)=>{ const c=data.concepts.find(x=>x.id===r.conceptId); return <div key={r.id} className="rounded-3xl border border-zinc-200 p-4"><div className="flex flex-wrap justify-between gap-2"><Badge>{c?.title || '연결 없음'}</Badge><Badge tone="red">틀림 {r.wrongCount}</Badge></div><p className="mt-3 whitespace-pre-wrap font-bold leading-7">{r.question}</p>{show[r.id] && <div className="mt-3 rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-bold text-zinc-500">정답</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{r.answer}</p></div>}<div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setShow(prev=>({...prev,[r.id]:!prev[r.id]}))}><Eye size={16} className="mr-2"/>정답</Button><Button variant="outline" onClick={()=>record(r,'correct')}><Check size={16} className="mr-2"/>맞힘</Button><Button variant="outline" onClick={()=>record(r,'wrong')}><X size={16} className="mr-2"/>틀림</Button></div></div>})}</div></Card>)}</div>}
  </div>;
}
