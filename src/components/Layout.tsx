import { BookOpen, Database, Download, FileWarning, Map, Menu, RefreshCw, Settings, Upload, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { KnowledgeData, TabId } from '../types';
import { Button } from './ui';

const navItems: Array<{ id: TabId; icon: any; fallback: string }> = [
  { id: 'quickInput', icon: Zap, fallback: '빠른 입력' },
  { id: 'map', icon: Map, fallback: '지식맵' },
  { id: 'study', icon: BookOpen, fallback: '학습모드' },
  { id: 'review', icon: RefreshCw, fallback: '복습' },
  { id: 'wrongNotes', icon: FileWarning, fallback: '오답노트' },
  { id: 'importExport', icon: Upload, fallback: '가져오기/내보내기' },
  { id: 'settings', icon: Settings, fallback: '설정' }
];

const labels: Record<TabId, string> = {
  quickInput: '빠른 입력',
  map: '지식맵',
  study: '학습모드',
  review: '복습',
  wrongNotes: '오답노트',
  importExport: '가져오기/내보내기',
  settings: '설정'
};

export function Layout({ data, tab, setTab, children, exportJson }: { data: KnowledgeData; tab: TabId; setTab: (tab: TabId) => void; children: ReactNode; exportJson: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f6f3] text-zinc-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white/80 p-5 lg:block">
          <Sidebar data={data} tab={tab} setTab={setTab} exportJson={exportJson} />
        </aside>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button className="rounded-2xl bg-zinc-100 p-2 lg:hidden" onClick={() => {
                  const event = new CustomEvent('open-mobile-nav');
                  window.dispatchEvent(event);
                }}><Menu size={20} /></button>
                <div>
                  <p className="text-xs font-bold text-zinc-500">{labels[tab]}</p>
                  <h1 className="text-lg font-black tracking-tight sm:text-xl">{data.settings.appName}</h1>
                  <p className="hidden text-xs text-zinc-500 sm:block">{data.settings.subtitle}</p>
                </div>
              </div>
              <Button variant="outline" onClick={exportJson}><Download className="mr-2" size={16} />백업</Button>
            </div>
            {children}
          </div>
        </main>
        <MobileNav data={data} tab={tab} setTab={setTab} exportJson={exportJson} />
      </div>
    </div>
  );
}

function Sidebar({ data, tab, setTab, exportJson }: { data: KnowledgeData; tab: TabId; setTab: (tab: TabId) => void; exportJson: () => void }) {
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl bg-zinc-900 p-2 text-white"><Database size={22} /></div>
        <div>
          <h2 className="text-lg font-black tracking-tight">{data.settings.appName}</h2>
          <p className="text-xs text-zinc-500">공부 흐름 중심 DB</p>
        </div>
      </div>
      <nav className="space-y-2">
        {navItems.map(({ id, icon: Icon, fallback }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${tab === id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
            <Icon size={18} /> {fallback}
          </button>
        ))}
      </nav>
      <div className="mt-8 rounded-3xl bg-zinc-100 p-4">
        <p className="text-sm font-black">저장 방식</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">브라우저 localStorage에 자동 저장돼. JSON으로 백업해두면 안전해.</p>
        <Button onClick={exportJson} className="mt-3 w-full"><Download className="mr-2" size={16} />JSON 백업</Button>
      </div>
    </>
  );
}

function MobileNav({ data, tab, setTab, exportJson }: { data: KnowledgeData; tab: TabId; setTab: (tab: TabId) => void; exportJson: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-mobile-nav', handler);
    return () => window.removeEventListener('open-mobile-nav', handler);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)}>
      <div className="h-full w-80 bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <Sidebar data={data} tab={tab} setTab={(next) => { setTab(next); setOpen(false); }} exportJson={exportJson} />
      </div>
    </div>
  );
}
