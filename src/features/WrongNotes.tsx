import { BookOpen } from 'lucide-react';
import type { KnowledgeData } from '../types';
import { Button, Card, Badge } from '../components/ui';
import { EmptyState, SectionTitle } from '../components/Common';

export function WrongNotes({ data, startStudy }: { data: KnowledgeData; startStudy: (conceptId: string) => void }) {
  return <div><SectionTitle title="오답노트" subtitle="틀린 문제는 자동으로 문제 단위로 저장돼요." />
    {data.wrongNotes.length === 0 ? <EmptyState title="아직 오답이 없어요" description="학습모드나 복습에서 틀림을 누르면 자동으로 저장돼요." /> : <div className="space-y-3">{data.wrongNotes.map((w)=>{ const c=data.concepts.find(x=>x.id===w.conceptId); return <Card key={w.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2"><Badge>{c?.subject || '미분류'}</Badge><Badge>{c?.unit || '미분류'}</Badge><Badge tone="blue">{c?.title || '연결 없음'}</Badge><Badge tone="red">틀린 횟수 {w.wrongCount}</Badge></div><Button variant="outline" onClick={()=>startStudy(w.conceptId)}><BookOpen size={16} className="mr-2"/>다시 학습</Button></div><p className="mt-4 whitespace-pre-wrap font-bold leading-7">{w.question}</p><div className="mt-3 rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-bold text-zinc-500">정답</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{w.answer}</p></div><p className="mt-3 text-xs text-zinc-500">틀린 날짜: {w.createdAt.slice(0,10)}</p></Card>})}</div>}
  </div>;
}
