import { Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { BackupSnapshot, ConfirmState, KnowledgeData } from '../types';
import { Button, Card, Badge } from '../components/ui';
import { EmptyState, SectionTitle } from '../components/Common';
import { backupFilename, createAutoBackup, deleteBackup, downloadBackup, downloadJson, loadBackups } from '../utils/storage';
import { downloadCsvTemplate, importCsvRows, parseCsv, validateCsvRows } from '../utils/csv';
import { normalizeData } from '../utils/normalize';
import { DataCheckPanel } from './DataCheck';

export function ImportExport({ data, setData, toast, setConfirm }: { data: KnowledgeData; setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void; toast: (m: string, t?: 'success' | 'error' | 'info') => void; setConfirm: (state: ConfirmState) => void }) {
  const jsonRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [backupVersion, setBackupVersion] = useState(0);

  function notifyBackup(reason: string) {
    toast(`${reason}을 만들었어요.`);
    setBackupVersion((v) => v + 1);
  }

  async function importJson(file: File) {
    const reason = 'JSON 복원 전 자동 백업';
    try {
      createAutoBackup(data, reason);
      notifyBackup(reason);
      const text = await file.text();
      const parsed = normalizeData(JSON.parse(text));
      setData(() => parsed);
      toast('JSON 복원이 완료됐어요.');
    } catch {
      toast('JSON 파일을 읽지 못했어요. 자동 백업은 보관되어 있어요.', 'error');
    }
  }

  async function importCsv(file: File) {
    const reason = 'CSV 가져오기 전 자동 백업';
    try {
      createAutoBackup(data, reason);
      notifyBackup(reason);
      const text = await file.text();
      const rows = parseCsv(text);
      const warnings = validateCsvRows(rows);
      if (warnings.some((w) => w.includes('필수 컬럼'))) { toast(`${warnings[0]} 자동 백업은 보관되어 있어요.`, 'error'); return; }
      const result = importCsvRows(data, rows);
      setData(() => result.data);
      toast(`CSV에서 문제 ${result.saved}개를 가져왔어요.${result.warnings.length ? ' 경고가 있어요.' : ''}`);
    } catch {
      toast('CSV 파일을 읽지 못했어요. 자동 백업은 보관되어 있어요.', 'error');
    }
  }

  return <div><SectionTitle title="가져오기/내보내기" subtitle="JSON 백업과 CSV 대량 입력을 지원해요. CSV/JSON 가져오기 전에는 자동 백업이 먼저 생성돼요." />
    <div className="grid gap-5 md:grid-cols-2">
      <Card className="p-5"><h3 className="text-lg font-black">백업/복원</h3><p className="mt-2 text-sm leading-6 text-zinc-500">전체 데이터를 JSON으로 저장하거나, 기존 v4/v5/v6 JSON 백업을 v6 구조로 복원할 수 있어요. JSON 복원 전 현재 데이터가 자동 백업돼요.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>downloadJson(data)}><Download size={16} className="mr-2"/>JSON 백업</Button><Button variant="outline" onClick={()=>jsonRef.current?.click()}><Upload size={16} className="mr-2"/>JSON 복원</Button></div><input ref={jsonRef} type="file" accept="application/json,.json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) void importJson(f); e.currentTarget.value=''; }}/></Card>
      <Card className="p-5"><h3 className="text-lg font-black">CSV 대량 입력</h3><p className="mt-2 text-sm leading-6 text-zinc-500">양식을 다운로드해서 엑셀로 편집한 뒤 CSV로 가져오면 과목→단원/대주제→주제/소개념→문제 구조로 자동 저장돼요. CSV 가져오기 전 현재 데이터가 자동 백업돼요.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={downloadCsvTemplate}><Download size={16} className="mr-2"/>CSV 템플릿</Button><Button variant="outline" onClick={()=>csvRef.current?.click()}><Upload size={16} className="mr-2"/>CSV 가져오기</Button></div><input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) void importCsv(f); e.currentTarget.value=''; }}/></Card>
    </div>
    <Card className="mt-5 p-5"><h3 className="text-lg font-black">CSV 컬럼</h3><p className="mt-2 text-sm leading-7 text-zinc-600">id, 과목, 단원, 주제, 앞면(문제), 뒷면(답)-키워드, 요약노트, 해설, 출처, 기출여부, 중요도, 문제유형, 난이도</p></Card>
    <DataCheckPanel data={data} setData={setData} toast={toast} setConfirm={setConfirm} />
    <BackupManager data={data} setData={setData} toast={toast} setConfirm={setConfirm} refreshKey={backupVersion} onChanged={() => setBackupVersion((v) => v + 1)} />
  </div>;
}

export function BackupManager({ data, setData, toast, setConfirm, refreshKey = 0, onChanged }: { data: KnowledgeData; setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void; toast: (m: string, t?: 'success' | 'error' | 'info') => void; setConfirm: (state: ConfirmState) => void; refreshKey?: number; onChanged?: () => void }) {
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => loadBackups());

  function refresh() {
    setBackups(loadBackups());
  }

  useEffect(() => { refresh(); }, [refreshKey]);

  function restoreBackup(backup: BackupSnapshot) {
    const backupData = backup.data;
    const reason = '백업 복원 전 자동 백업';
    createAutoBackup(data, reason);
    refresh();
    onChanged?.();
    toast(`${reason}을 만들었어요.`);
    setConfirm({
      type: 'restoreBackup',
      title: '백업에서 복원할까요?',
      message: `${new Date(backup.createdAt).toLocaleString()}에 생성된 “${backup.reason}” 백업으로 현재 데이터를 복원합니다. 복원 직전 현재 데이터도 자동 백업해두었어요.`,
      onConfirm: () => {
        setData(() => normalizeData(backupData));
        toast('백업에서 복원했어요.');
        refresh();
        onChanged?.();
      }
    });
  }

  function removeBackup(backupId: string) {
    setBackups(deleteBackup(backupId));
    onChanged?.();
    toast('백업을 삭제했어요.');
  }

  return <Card className="mt-5 p-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h3 className="text-lg font-black">백업 관리</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">CSV 가져오기, JSON 복원, 전체 초기화, 백업 복원 전에 자동으로 생성된 백업을 관리해요. 최근 10개까지만 보관돼요.</p>
      </div>
      <Button variant="outline" onClick={refresh}><RefreshCw size={16} className="mr-2" />새로고침</Button>
    </div>
    {backups.length === 0 ? <div className="mt-4"><EmptyState title="저장된 자동 백업이 없어요" description="CSV 가져오기, JSON 복원, 전체 초기화, 백업 복원을 실행하면 자동 백업이 생성돼요." /></div> :
      <div className="mt-4 space-y-3">
        {backups.map((backup) => <div key={backup.id} className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2"><Badge>{backup.reason}</Badge><Badge tone="blue">{new Date(backup.createdAt).toLocaleString()}</Badge></div>
              <p className="mt-2 text-xs text-zinc-500">{backupFilename(backup)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => downloadBackup(backup)}><Download size={16} className="mr-2" />다운로드</Button>
              <Button variant="outline" onClick={() => restoreBackup(backup)}>복원</Button>
              <Button variant="ghost" onClick={() => removeBackup(backup.id)}><Trash2 size={16} /></Button>
            </div>
          </div>
        </div>)}
      </div>
    }
  </Card>;
}
