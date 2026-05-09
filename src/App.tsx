import { useEffect, useState } from 'react';
import type { ConfirmState, KnowledgeData, TabId, ToastState } from './types';
import { loadData, saveData, downloadJson } from './utils/storage';
import { Layout } from './components/Layout';
import { Toast, ConfirmModal } from './components/Common';
import { QuickInput } from './features/QuickInput';
import { KnowledgeMap } from './features/KnowledgeMap';
import { StudyMode } from './features/StudyMode';
import { Review } from './features/Review';
import { WrongNotes } from './features/WrongNotes';
import { ImportExport } from './features/ImportExport';
import { SettingsPage } from './features/Settings';

export default function App() {
  const [data, setDataState] = useState<KnowledgeData>(() => loadData());
  const [tab, setTab] = useState<TabId>('quickInput');
  const [toast, setToast] = useState<ToastState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [studyConceptId, setStudyConceptId] = useState('');

  useEffect(() => { saveData(data); }, [data]);

  function setData(updater: (prev: KnowledgeData) => KnowledgeData) {
    setDataState((prev) => updater(prev));
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2400);
  }

  function openQuickInput(subject = '', unit = '', topic = '', conceptId = '') {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, recentInput: { subject: subject || prev.settings.recentInput.subject, unit: unit || prev.settings.recentInput.unit, topic: topic || prev.settings.recentInput.topic, conceptId: conceptId || prev.settings.recentInput.conceptId } } }));
    setTab('quickInput');
  }

  function goMap(conceptId: string) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, recentInput: { ...prev.settings.recentInput, conceptId } } }));
    setTab('map');
  }

  function startStudy(conceptId: string) {
    setStudyConceptId(conceptId);
    setTab('study');
  }

  return (
    <Layout data={data} tab={tab} setTab={setTab} exportJson={() => downloadJson(data)}>
      <Toast toast={toast} />
      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
      {tab === 'quickInput' && <QuickInput data={data} setData={setData} toast={showToast} goMap={goMap} />}
      {tab === 'map' && <KnowledgeMap data={data} setData={setData} toast={showToast} openQuickInput={openQuickInput} startConceptStudy={startStudy} setConfirm={setConfirm} />}
      {tab === 'study' && <StudyMode data={data} setData={setData} toast={showToast} initialConceptId={studyConceptId} />}
      {tab === 'review' && <Review data={data} setData={setData} toast={showToast} />}
      {tab === 'wrongNotes' && <WrongNotes data={data} startStudy={startStudy} />}
      {tab === 'importExport' && <ImportExport data={data} setData={setData} toast={showToast} setConfirm={setConfirm} />}
      {tab === 'settings' && <SettingsPage data={data} setData={setData} toast={showToast} setConfirm={setConfirm} />}
    </Layout>
  );
}
