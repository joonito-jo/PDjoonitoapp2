import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';
import type { ConfirmState, ToastState } from '../types';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      <p className="font-black text-zinc-700">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const tone = toast.type === 'error' ? 'bg-red-600' : 'bg-zinc-900';
  return <div className={`fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl px-5 py-4 text-sm font-bold text-white shadow-xl ${tone}`}>{toast.message}</div>;
}

export function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex gap-3">
          <div className="rounded-2xl bg-red-50 p-2 text-red-600"><AlertTriangle size={22} /></div>
          <div>
            <h3 className="text-lg font-black">{state.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{state.message}</p>
          </div>
        </div>
        {state.type === 'deleteConcept' ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button variant="outline" onClick={() => { state.onConfirm('unlink'); onClose(); }}>소개념만 삭제</Button>
            <Button variant="danger" onClick={() => { state.onConfirm('deleteAll'); onClose(); }}>문제까지 삭제</Button>
          </div>
        ) : state.type === 'reset' && state.requireText ? (
          <ResetConfirm state={state} onClose={onClose} />
        ) : (
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button variant="danger" onClick={() => { state.onConfirm(); onClose(); }}>확인</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResetConfirm({ state, onClose }: { state: Extract<ConfirmState, { type: 'reset' }>; onClose: () => void }) {
  const required = state.requireText || '초기화';
  const input = document.getElementById('reset-confirm-input') as HTMLInputElement | null;
  return (
    <div className="mt-6 space-y-3">
      <input id="reset-confirm-input" placeholder={`'${required}' 입력`} className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>취소</Button>
        <Button variant="danger" onClick={() => {
          const value = (document.getElementById('reset-confirm-input') as HTMLInputElement | null)?.value || '';
          if (value === required) { state.onConfirm(); onClose(); }
        }}>전체 초기화</Button>
      </div>
    </div>
  );
}


export function SummaryNoteBox({ note, title = '요약노트', emptyText = '아직 요약노트가 없습니다' }: { note?: string; title?: string; emptyText?: string }) {
  const hasNote = Boolean(note && note.trim());
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-stone-50 p-5 shadow-sm">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-white/45" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-amber-200/70 px-3 py-1 text-xs font-black text-amber-900">NOTE</span>
          <h4 className="text-sm font-black text-stone-800">{title}</h4>
        </div>
        <div className="rounded-2xl bg-white/65 p-4 ring-1 ring-amber-100/80">
          <p className={`whitespace-pre-wrap break-keep text-sm leading-8 ${hasNote ? 'text-stone-800' : 'text-stone-400'}`}>
            {hasNote ? note : emptyText}
          </p>
        </div>
      </div>
    </div>
  );
}
