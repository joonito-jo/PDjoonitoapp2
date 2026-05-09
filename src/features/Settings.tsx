import { Download, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ConfirmState, KnowledgeData } from '../types';
import { Button, Card, Badge } from '../components/ui';
import { Field } from '../components/Form';
import { SectionTitle } from '../components/Common';
import { downloadCsvTemplate } from '../utils/csv';
import { createAutoBackup, downloadJson } from '../utils/storage';
import { emptyData } from '../data/initialData';
import { normalizeData } from '../utils/normalize';
import { BackupManager } from './ImportExport';
import { DataCheckPanel } from './DataCheck';

export function SettingsPage({ data, setData, toast, setConfirm }: { data: KnowledgeData; setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void; toast: (m: string, t?: 'success' | 'error' | 'info') => void; setConfirm: (state: ConfirmState) => void }) {
  const [newStatus, setNewStatus] = useState('');
  const [backupVersion, setBackupVersion] = useState(0);
  const jsonRef = useRef<HTMLInputElement>(null);
  const intervals = data.settings.reviewIntervals;

  function notifyBackup(reason: string) {
    toast(`${reason}을 만들었어요.`);
    setBackupVersion((v) => v + 1);
  }

  function updateSetting(patch: Partial<KnowledgeData['settings']>) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }
  function updateInterval(key: keyof typeof intervals, value: string) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, reviewIntervals: { ...prev.settings.reviewIntervals, [key]: Number(value) } } }));
  }
  function addStatus() {
    const v = newStatus.trim();
    if (!v) return;
    if (data.settings.statusOptions.includes(v)) { toast('이미 있는 상태값이에요.', 'error'); return; }
    updateSetting({ statusOptions: [...data.settings.statusOptions, v] });
    setNewStatus('');
    toast('학습 상태를 추가했어요.');
  }
  function renameStatus(old: string, next: string) {
    if (!next.trim()) return;
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, statusOptions: prev.settings.statusOptions.map((s) => s === old ? next.trim() : s) },
      concepts: prev.concepts.map((c) => c.status === old ? { ...c, status: next.trim() } : c),
      recalls: prev.recalls.map((r) => r.status === old ? { ...r, status: next.trim() } : r)
    }));
  }
  function deleteStatus(status: string) {
    const used = data.concepts.some((c) => c.status === status) || data.recalls.some((r) => r.status === status);
    if (used) { toast('사용 중인 상태값은 삭제할 수 없어요.', 'error'); return; }
    if (data.settings.statusOptions.length <= 1) { toast('상태값은 최소 1개가 필요해요.', 'error'); return; }
    updateSetting({ statusOptions: data.settings.statusOptions.filter((s) => s !== status) });
    toast('상태값을 삭제했어요.');
  }
  async function importJson(file: File) {
    const reason = 'JSON 복원 전 자동 백업';
    try {
      createAutoBackup(data, reason);
      notifyBackup(reason);
      const parsed = normalizeData(JSON.parse(await file.text()));
      setData(() => parsed);
      toast('JSON 복원 완료');
    } catch { toast('JSON을 읽지 못했어요. 자동 백업은 보관되어 있어요.', 'error'); }
  }
  function requestReset() {
    const reason = '전체 초기화 전 자동 백업';
    createAutoBackup(data, reason);
    notifyBackup(reason);
    setConfirm({ type: 'reset', title: '전체 데이터를 초기화할까요?', message: '모든 과목, 대주제, 소개념, 문제, 오답노트가 삭제됩니다. 현재 데이터는 자동 백업으로 먼저 보관했어요.', requireText: '초기화', onConfirm: () => { setData(() => emptyData()); toast('전체 데이터를 초기화했어요.'); } });
  }
  return <div><SectionTitle title="설정" subtitle="앱 이름, 상태값, 복습 규칙, 백업과 초기화를 관리해요." />
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5"><h3 className="text-lg font-black">앱 표시 설정</h3><div className="mt-4 space-y-3"><Field label="앱 이름" value={data.settings.appName} onChange={(v)=>updateSetting({appName:v})}/><Field label="앱 부제목" value={data.settings.subtitle} onChange={(v)=>updateSetting({subtitle:v})}/></div></Card>
      <Card className="p-5"><h3 className="text-lg font-black">복습 간격</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="첫 번째 맞힘" type="number" value={intervals.firstCorrect} onChange={(v)=>updateInterval('firstCorrect',v)}/><Field label="두 번째 연속 맞힘" type="number" value={intervals.secondCorrect} onChange={(v)=>updateInterval('secondCorrect',v)}/><Field label="세 번째 연속 맞힘" type="number" value={intervals.thirdCorrect} onChange={(v)=>updateInterval('thirdCorrect',v)}/><Field label="네 번째 이상 맞힘" type="number" value={intervals.fourthCorrect} onChange={(v)=>updateInterval('fourthCorrect',v)}/><Field label="틀림" type="number" value={intervals.wrong} onChange={(v)=>updateInterval('wrong',v)}/><Field label="중요도 보정값" type="number" value={intervals.highImportanceModifier} onChange={(v)=>updateInterval('highImportanceModifier',v)}/></div></Card>
      <Card className="p-5"><h3 className="text-lg font-black">학습 상태</h3><div className="mt-4 space-y-3">{data.settings.statusOptions.map((s)=><div key={s} className="grid gap-2 sm:grid-cols-[1fr_auto]"><Field label="상태명" value={s} onChange={(v)=>renameStatus(s,v)}/><Button variant="ghost" onClick={()=>deleteStatus(s)}><Trash2 size={16}/></Button></div>)}<div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Field label="새 상태" value={newStatus} onChange={setNewStatus}/><Button onClick={addStatus}><Plus size={16} className="mr-2"/>추가</Button></div></div></Card>
      <Card className="p-5"><h3 className="text-lg font-black">과목 목록</h3><div className="mt-4 flex flex-wrap gap-2">{Array.from(new Set([...data.settings.subjects, ...data.concepts.map(c=>c.subject)])).filter(Boolean).map(s=><Badge key={s}>{s}</Badge>)}</div><p className="mt-3 text-sm text-zinc-500">과목 추가와 이름 변경은 지식맵에서 할 수 있어요.</p></Card>
      <Card className="p-5"><h3 className="text-lg font-black">백업/복원</h3><p className="mt-2 text-sm leading-6 text-zinc-500">JSON 복원 전에는 현재 데이터가 자동 백업돼요.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>downloadJson(data)}><Download size={16} className="mr-2"/>JSON 백업</Button><Button variant="outline" onClick={()=>jsonRef.current?.click()}>JSON 복원</Button><Button variant="outline" onClick={downloadCsvTemplate}>CSV 양식</Button></div><input ref={jsonRef} type="file" accept=".json,application/json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void importJson(f); e.currentTarget.value='';}}/></Card>
      <Card className="p-5 border-red-100"><h3 className="text-lg font-black text-red-700">전체 데이터 초기화</h3><p className="mt-2 text-sm leading-6 text-zinc-500">전체 초기화를 누르면 현재 데이터가 자동 백업된 뒤 확인창이 열려요.</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>downloadJson(data)}>수동 백업</Button><Button variant="danger" onClick={requestReset}>전체 초기화</Button></div></Card>
    </div>
    <DataCheckPanel data={data} setData={setData} toast={toast} setConfirm={setConfirm} />
    <BackupManager data={data} setData={setData} toast={toast} setConfirm={setConfirm} refreshKey={backupVersion} onChanged={() => setBackupVersion((v) => v + 1)} />
  </div>;
}
