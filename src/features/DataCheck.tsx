import { Download, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { ConfirmState, KnowledgeData } from '../types';
import type { DataCheckIssue, DataCheckResult } from '../utils/dataCheck';
import { autoRepairData, downloadDataCheckResult, runDataCheck } from '../utils/dataCheck';
import { createAutoBackup } from '../utils/storage';
import { Button, Card, Badge } from '../components/ui';
import { EmptyState } from '../components/Common';

function severityBadge(severity: DataCheckIssue['severity']) {
  if (severity === 'critical') return <Badge tone="red">심각</Badge>;
  if (severity === 'warning') return <Badge tone="amber">경고</Badge>;
  return <Badge tone="blue">참고</Badge>;
}

function IssueList({ title, issues }: { title: string; issues: DataCheckIssue[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-black text-zinc-900">{title} <span className="text-sm font-semibold text-zinc-500">{issues.length}개</span></h4>
      {issues.length === 0 ? <EmptyState title="문제 없음" description={`${title} 항목은 발견되지 않았어요.`} /> : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-3xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                {severityBadge(issue.severity)}
                <Badge>{issue.category}</Badge>
                <Badge tone={issue.autoFixable ? 'green' : 'zinc'}>{issue.autoFixable ? '자동 복구 가능' : '수동 확인 필요'}</Badge>
              </div>
              <p className="mt-3 font-black">{issue.issueType}</p>
              <div className="mt-2 space-y-1 text-sm leading-6 text-zinc-600">
                <p><b>대상:</b> {issue.targetType} · {issue.targetId || '(id 없음)'}</p>
                <p><b>현재 상태:</b> {issue.currentState}</p>
                <p><b>권장 조치:</b> {issue.recommendedAction}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DataCheckPanel({ data, setData, toast, setConfirm }: { data: KnowledgeData; setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void; toast: (m: string, t?: 'success' | 'error' | 'info') => void; setConfirm: (state: ConfirmState) => void }) {
  const [result, setResult] = useState<DataCheckResult | null>(null);

  function runCheck() {
    const next = runDataCheck(data);
    setResult(next);
    toast(`데이터 점검 완료: 심각 ${next.summary.critical}개, 경고 ${next.summary.warning}개, 참고 ${next.summary.info}개`);
  }

  function requestAutoRepair() {
    const currentResult = result || runDataCheck(data);
    setResult(currentResult);
    if (currentResult.summary.autoFixable === 0) {
      toast('자동으로 복구할 항목이 없어요.', 'info');
      return;
    }
    const reason = '데이터 자동 복구 전 자동 백업';
    createAutoBackup(data, reason);
    toast(`${reason}을 만들었어요.`);
    setConfirm({
      type: 'autoRepair',
      title: '자동 복구를 실행할까요?',
      message: `자동 복구 가능 항목 ${currentResult.summary.autoFixable}개를 안전한 범위에서 보정합니다. 빈 문제/빈 정답/문제 없는 소개념/오답노트 연결 오류처럼 삭제가 필요한 항목은 자동 삭제하지 않고 수동 확인 대상으로 남겨둡니다.`,
      onConfirm: () => {
        const repaired = autoRepairData(data);
        setData(() => repaired.data);
        const after = runDataCheck(repaired.data);
        setResult(after);
        toast(`자동 복구 완료: ${repaired.fixedCount}개 항목을 보정했어요.`);
      }
    });
  }

  return (
    <Card className="mt-5 p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h3 className="text-lg font-black">데이터 점검</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">중복 ID, 연결 끊김, 필수값 누락, 상태값 오류, 날짜 문제를 점검하고 안전하게 복구할 수 있어요. 자동 복구 전에는 현재 데이터가 자동 백업돼요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={runCheck}><ShieldCheck size={16} className="mr-2" />데이터 점검하기</Button>
          <Button variant="outline" onClick={requestAutoRepair}><Wrench size={16} className="mr-2" />자동 복구하기</Button>
          <Button variant="outline" disabled={!result} onClick={() => result && downloadDataCheckResult(result)}><Download size={16} className="mr-2" />점검 결과 JSON</Button>
        </div>
      </div>

      {!result ? (
        <div className="mt-5"><EmptyState title="아직 점검하지 않았어요" description="데이터 점검하기 버튼을 눌러 현재 데이터 상태를 확인해 주세요." /></div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-3xl bg-red-50 p-4"><p className="text-sm font-bold text-red-600">심각</p><p className="mt-1 text-3xl font-black text-red-700">{result.summary.critical}</p></div>
            <div className="rounded-3xl bg-amber-50 p-4"><p className="text-sm font-bold text-amber-600">경고</p><p className="mt-1 text-3xl font-black text-amber-700">{result.summary.warning}</p></div>
            <div className="rounded-3xl bg-blue-50 p-4"><p className="text-sm font-bold text-blue-600">참고</p><p className="mt-1 text-3xl font-black text-blue-700">{result.summary.info}</p></div>
            <div className="rounded-3xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-600">자동 복구 가능</p><p className="mt-1 text-3xl font-black text-emerald-700">{result.summary.autoFixable}</p></div>
            <div className="rounded-3xl bg-zinc-50 p-4"><p className="text-sm font-bold text-zinc-600">수동 확인 필요</p><p className="mt-1 text-3xl font-black text-zinc-700">{result.summary.manualOnly}</p></div>
          </div>

          <IssueList title="심각 항목" issues={result.critical} />
          <IssueList title="경고 항목" issues={result.warning} />
          <IssueList title="참고 항목" issues={result.info} />
        </div>
      )}
    </Card>
  );
}
