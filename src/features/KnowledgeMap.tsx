import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Concept,
  ConfirmState,
  KnowledgeData,
  Recall,
  RecentItem,
} from "../types";
import { Button, Card, Badge } from "../components/ui";
import { EmptyState, SectionTitle, SummaryNoteBox } from "../components/Common";
import { Field } from "../components/Form";
import { nowISO, isDue } from "../utils/date";

const includesText = (value: unknown, query: string) =>
  String(value || "")
    .toLowerCase()
    .includes(query.toLowerCase());

const pathForConcept = (concept: Concept) =>
  `${concept.subject} > ${concept.unit} > ${concept.title}`;

type Props = {
  data: KnowledgeData;
  setData: (updater: (prev: KnowledgeData) => KnowledgeData) => void;
  toast: (m: string, t?: "success" | "error" | "info") => void;
  openQuickInput: (
    subject?: string,
    unit?: string,
    topic?: string,
    conceptId?: string,
  ) => void;
  startConceptStudy: (conceptId: string) => void;
  setConfirm: (state: ConfirmState) => void;
};

type SearchResult =
  | {
      type: "concept";
      id: string;
      title: string;
      path: string;
      isFavorite: boolean;
    }
  | {
      type: "recall";
      id: string;
      conceptId: string;
      title: string;
      path: string;
      isFavorite: boolean;
    };

export function KnowledgeMap({
  data,
  setData,
  toast,
  openQuickInput,
  startConceptStudy,
  setConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState(
    data.settings.recentInput.conceptId || data.concepts[0]?.id || "",
  );
  const [selectedRecallId, setSelectedRecallId] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [expandedConcepts, setExpandedConcepts] = useState<string[]>([]);
  const [editingProblemId, setEditingProblemId] = useState("");
  const [problemDraft, setProblemDraft] = useState<Partial<Recall>>({});
  const [editingConcept, setEditingConcept] = useState(false);
  const [conceptDraft, setConceptDraft] = useState<Partial<Concept>>({});
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [renameSubjectFrom, setRenameSubjectFrom] = useState("");
  const [renameSubjectTo, setRenameSubjectTo] = useState("");
  const [renameUnitFrom, setRenameUnitFrom] = useState("");
  const [renameUnitTo, setRenameUnitTo] = useState("");

  const selectedConcept =
    data.concepts.find((c) => c.id === selectedConceptId) || null;
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...data.settings.subjects,
            ...data.subjects,
            ...data.concepts.map((c) => c.subject),
          ].filter(Boolean),
        ),
      ).sort(),
    [data],
  );
  const unitsForFilter = useMemo(
    () =>
      Array.from(
        new Set(
          data.concepts
            .filter((c) => !subjectFilter || c.subject === subjectFilter)
            .map((c) => c.unit)
            .filter(Boolean),
        ),
      ).sort(),
    [data.concepts, subjectFilter],
  );

  const wrongRecallIds = useMemo(
    () => new Set(data.wrongNotes.map((note) => note.recallId)),
    [data.wrongNotes],
  );

  function clearFilters() {
    setQuery("");
    setSubjectFilter("");
    setUnitFilter("");
    setStatusFilter("");
    setImportanceFilter("");
    setFavoriteOnly(false);
    setDueOnly(false);
    setWrongOnly(false);
  }

  function recallPassesFilters(
    recall: Recall,
    concept?: Concept,
    conceptMatchedQuery = false,
  ) {
    if (subjectFilter && concept?.subject !== subjectFilter) return false;
    if (unitFilter && concept?.unit !== unitFilter) return false;
    if (statusFilter && recall.status !== statusFilter) return false;
    if (
      importanceFilter &&
      Number(recall.importance) < Number(importanceFilter)
    )
      return false;
    if (favoriteOnly && !recall.isFavorite && !concept?.isFavorite)
      return false;
    if (dueOnly && !isDue(recall.nextReviewAt)) return false;
    if (wrongOnly && !recall.wrongCount && !wrongRecallIds.has(recall.id))
      return false;

    const cleanQuery = query.trim();
    if (!cleanQuery || conceptMatchedQuery) return true;
    return [
      recall.question,
      recall.answer,
      recall.explanation,
      recall.keywords,
      recall.source,
      recall.type,
      recall.isPastExam,
    ].some((value) => includesText(value, cleanQuery));
  }

  function conceptPassesFilters(concept: Concept) {
    if (subjectFilter && concept.subject !== subjectFilter) return false;
    if (unitFilter && concept.unit !== unitFilter) return false;
    if (statusFilter && concept.status !== statusFilter) return false;
    if (
      importanceFilter &&
      Number(concept.importance) < Number(importanceFilter)
    )
      return false;
    if (
      favoriteOnly &&
      !concept.isFavorite &&
      !data.recalls.some((r) => r.conceptId === concept.id && r.isFavorite)
    )
      return false;

    const conceptMatchedQuery =
      !query.trim() ||
      [
        concept.subject,
        concept.unit,
        concept.topic,
        concept.title,
        concept.summaryNote,
        concept.description,
        concept.keywords,
        concept.source,
        concept.memo,
      ].some((value) => includesText(value, query));
    const recalls = data.recalls.filter((r) => r.conceptId === concept.id);
    const hasMatchingRecall = recalls.some((r) =>
      recallPassesFilters(r, concept, conceptMatchedQuery),
    );

    if (dueOnly && !recalls.some((r) => isDue(r.nextReviewAt))) return false;
    if (
      wrongOnly &&
      !recalls.some((r) => r.wrongCount > 0 || wrongRecallIds.has(r.id))
    )
      return false;
    if (query.trim() && !conceptMatchedQuery && !hasMatchingRecall)
      return false;
    return conceptMatchedQuery || hasMatchingRecall || !query.trim();
  }

  const visibleConcepts = useMemo(
    () => data.concepts.filter(conceptPassesFilters),
    [
      data.concepts,
      data.recalls,
      data.wrongNotes,
      query,
      subjectFilter,
      unitFilter,
      statusFilter,
      importanceFilter,
      favoriteOnly,
      dueOnly,
      wrongOnly,
    ],
  );

  const visibleSubjects = useMemo(
    () =>
      Array.from(
        new Set(visibleConcepts.map((c) => c.subject).filter(Boolean)),
      ).sort(),
    [visibleConcepts],
  );

  const searchResults = useMemo<SearchResult[]>(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const results: SearchResult[] = [];
    visibleConcepts.forEach((concept) => {
      const matchedConcept = [
        concept.subject,
        concept.unit,
        concept.topic,
        concept.title,
        concept.summaryNote,
        concept.description,
        concept.keywords,
        concept.source,
        concept.memo,
      ].some((value) => includesText(value, cleanQuery));
      if (matchedConcept) {
        results.push({
          type: "concept",
          id: concept.id,
          title: concept.title,
          path: `${concept.subject} > ${concept.unit}`,
          isFavorite: concept.isFavorite,
        });
      }
      data.recalls
        .filter((recall) => recall.conceptId === concept.id)
        .filter((recall) =>
          recallPassesFilters(recall, concept, matchedConcept),
        )
        .filter((recall) =>
          [
            recall.question,
            recall.answer,
            recall.explanation,
            recall.keywords,
            recall.source,
            recall.type,
            recall.isPastExam,
          ].some((value) => includesText(value, cleanQuery)),
        )
        .forEach((recall) => {
          results.push({
            type: "recall",
            id: recall.id,
            conceptId: concept.id,
            title: recall.question,
            path: pathForConcept(concept),
            isFavorite: recall.isFavorite,
          });
        });
    });
    return results.slice(0, 80);
  }, [
    query,
    visibleConcepts,
    data.recalls,
    subjectFilter,
    unitFilter,
    statusFilter,
    importanceFilter,
    favoriteOnly,
    dueOnly,
    wrongOnly,
  ]);

  function addRecent(item: Omit<RecentItem, "id" | "viewedAt">) {
    setData((prev) => {
      const nextItem: RecentItem = {
        ...item,
        id: `recent-${Date.now()}`,
        viewedAt: nowISO(),
      };
      const filtered = prev.settings.recentItems.filter(
        (recent) =>
          !(recent.type === item.type && recent.targetId === item.targetId),
      );
      return {
        ...prev,
        settings: {
          ...prev.settings,
          recentItems: [nextItem, ...filtered].slice(0, 10),
        },
      };
    });
  }

  function selectConcept(conceptId: string) {
    const concept = data.concepts.find((c) => c.id === conceptId);
    if (!concept) return;
    setSelectedConceptId(concept.id);
    setSelectedRecallId("");
    setEditingConcept(false);
    setExpandedSubjects((prev) =>
      Array.from(new Set([...prev, concept.subject])),
    );
    setExpandedUnits((prev) =>
      Array.from(new Set([...prev, `${concept.subject}|||${concept.unit}`])),
    );
    setExpandedConcepts((prev) => Array.from(new Set([...prev, concept.id])));
    addRecent({
      type: "concept",
      targetId: concept.id,
      title: concept.title,
      path: `${concept.subject} > ${concept.unit}`,
    });
  }

  function selectRecall(recallId: string) {
    const recall = data.recalls.find((r) => r.id === recallId);
    const concept = data.concepts.find((c) => c.id === recall?.conceptId);
    if (!recall || !concept) return;
    setSelectedConceptId(concept.id);
    setSelectedRecallId(recall.id);
    setExpandedSubjects((prev) =>
      Array.from(new Set([...prev, concept.subject])),
    );
    setExpandedUnits((prev) =>
      Array.from(new Set([...prev, `${concept.subject}|||${concept.unit}`])),
    );
    setExpandedConcepts((prev) => Array.from(new Set([...prev, concept.id])));
    addRecent({
      type: "recall",
      targetId: recall.id,
      title: recall.question,
      path: pathForConcept(concept),
    });
  }

  function toggleList(
    value: string,
    setter: (updater: (prev: string[]) => string[]) => void,
  ) {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }

  function visibleRecallsForConcept(concept: Concept) {
    const conceptMatchedQuery = query.trim()
      ? [
          concept.subject,
          concept.unit,
          concept.topic,
          concept.title,
          concept.summaryNote,
          concept.description,
          concept.keywords,
          concept.source,
          concept.memo,
        ].some((value) => includesText(value, query))
      : false;
    return data.recalls
      .filter((r) => r.conceptId === concept.id)
      .filter((r) => recallPassesFilters(r, concept, conceptMatchedQuery));
  }

  function statsForSubject(subjectName: string) {
    const concepts = data.concepts.filter((c) => c.subject === subjectName);
    const conceptIds = concepts.map((c) => c.id);
    const recalls = data.recalls.filter((r) =>
      conceptIds.includes(r.conceptId),
    );
    return {
      units: new Set(concepts.map((c) => c.unit)).size,
      problems: recalls.length,
    };
  }

  function statsForUnit(subjectName: string, unitName: string) {
    const concepts = data.concepts.filter(
      (c) => c.subject === subjectName && c.unit === unitName,
    );
    const conceptIds = concepts.map((c) => c.id);
    const recalls = data.recalls.filter((r) =>
      conceptIds.includes(r.conceptId),
    );
    return { concepts: concepts.length, problems: recalls.length };
  }

  function toggleConceptFavorite(conceptId: string) {
    setData((prev) => ({
      ...prev,
      concepts: prev.concepts.map((c) =>
        c.id === conceptId
          ? { ...c, isFavorite: !c.isFavorite, updatedAt: nowISO() }
          : c,
      ),
    }));
  }

  function toggleRecallFavorite(recallId: string) {
    setData((prev) => ({
      ...prev,
      recalls: prev.recalls.map((r) =>
        r.id === recallId
          ? { ...r, isFavorite: !r.isFavorite, updatedAt: nowISO() }
          : r,
      ),
    }));
  }

  function beginConceptEdit(concept: Concept) {
    setConceptDraft(concept);
    setEditingConcept(true);
  }

  function saveConceptEdit() {
    if (!selectedConcept) return;
    setData((prev) => ({
      ...prev,
      concepts: prev.concepts.map((c) =>
        c.id === selectedConcept.id
          ? ({
              ...c,
              ...conceptDraft,
              topic: String(conceptDraft.title || c.title),
              updatedAt: nowISO(),
            } as Concept)
          : c,
      ),
    }));
    setEditingConcept(false);
    toast("주제/소개념을 수정했어요.");
  }

  function deleteConcept(concept: Concept) {
    const count = data.recalls.filter((r) => r.conceptId === concept.id).length;
    setConfirm({
      type: "deleteConcept",
      title: "주제/소개념을 삭제할까요?",
      message: `${concept.title}에 연결된 문제 ${count}개가 있어요. 선택해서 삭제할 수 있어요.`,
      onConfirm: (mode) => {
        setData((prev) => ({
          ...prev,
          concepts: prev.concepts.filter((c) => c.id !== concept.id),
          recalls:
            mode === "deleteAll"
              ? prev.recalls.filter((r) => r.conceptId !== concept.id)
              : prev.recalls.map((r) =>
                  r.conceptId === concept.id
                    ? { ...r, conceptId: "", updatedAt: nowISO() }
                    : r,
                ),
          wrongNotes:
            mode === "deleteAll"
              ? prev.wrongNotes.filter((w) => w.conceptId !== concept.id)
              : prev.wrongNotes,
          settings: {
            ...prev.settings,
            recentItems: prev.settings.recentItems.filter(
              (item) => item.targetId !== concept.id,
            ),
          },
        }));
        setSelectedConceptId("");
        setSelectedRecallId("");
        toast(
          mode === "deleteAll"
            ? "주제/소개념과 연결 문제를 함께 삭제했어요."
            : "주제/소개념만 삭제하고 문제 연결을 해제했어요.",
        );
      },
    });
  }

  function saveProblemEdit() {
    if (!editingProblemId) return;
    setData((prev) => ({
      ...prev,
      recalls: prev.recalls.map((r) =>
        r.id === editingProblemId
          ? ({ ...r, ...problemDraft, updatedAt: nowISO() } as Recall)
          : r,
      ),
    }));
    setEditingProblemId("");
    setProblemDraft({});
    toast("문제를 수정했어요.");
  }

  function deleteProblem(problem: Recall) {
    setConfirm({
      type: "deleteProblem",
      title: "문제를 삭제할까요?",
      message: "삭제한 문제는 복구하기 어려워요.",
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          recalls: prev.recalls.filter((r) => r.id !== problem.id),
          wrongNotes: prev.wrongNotes.filter((w) => w.recallId !== problem.id),
          settings: {
            ...prev.settings,
            recentItems: prev.settings.recentItems.filter(
              (item) => item.targetId !== problem.id,
            ),
          },
        }));
        if (selectedRecallId === problem.id) setSelectedRecallId("");
        toast("문제를 삭제했어요.");
      },
    });
  }

  function renameSubject() {
    if (!renameSubjectFrom || !renameSubjectTo.trim()) return;
    const nextName = renameSubjectTo.trim();
    setData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s === renameSubjectFrom ? nextName : s,
      ),
      settings: {
        ...prev.settings,
        subjects: prev.settings.subjects.map((s) =>
          s === renameSubjectFrom ? nextName : s,
        ),
      },
      concepts: prev.concepts.map((c) =>
        c.subject === renameSubjectFrom
          ? { ...c, subject: nextName, updatedAt: nowISO() }
          : c,
      ),
    }));
    setRenameSubjectFrom("");
    setRenameSubjectTo("");
    toast("과목명을 일괄 변경했어요.");
  }

  function renameUnit() {
    if (!renameUnitFrom || !renameUnitTo.trim()) return;
    const [subjectName, unitName] = renameUnitFrom.split("|||");
    const nextName = renameUnitTo.trim();
    setData((prev) => ({
      ...prev,
      concepts: prev.concepts.map((c) =>
        c.subject === subjectName && c.unit === unitName
          ? { ...c, unit: nextName, updatedAt: nowISO() }
          : c,
      ),
    }));
    setRenameUnitFrom("");
    setRenameUnitTo("");
    toast("단원/대주제명을 일괄 변경했어요.");
  }

  function renderFavoriteButton(
    active: boolean,
    onClick: () => void,
    label = "즐겨찾기",
  ) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold ${active ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
        title={label}
      >
        {active ? (
          <Star size={14} fill="currentColor" />
        ) : (
          <StarOff size={14} />
        )}
        {active ? "즐겨찾기" : "추가"}
      </button>
    );
  }

  const selectedConceptProblems = selectedConcept
    ? data.recalls.filter((r) => r.conceptId === selectedConcept.id)
    : [];

  return (
    <div>
      <SectionTitle
        title="지식맵"
        subtitle="검색하고, 접고 펼치며, 과목 → 단원/대주제 → 주제/소개념 → 문제 구조를 관리해요."
        action={
          <Button
            onClick={() =>
              openQuickInput(
                selectedConcept?.subject || subjectFilter,
                selectedConcept?.unit || unitFilter,
                selectedConcept?.title || "",
                selectedConcept?.id || "",
              )
            }
          >
            <Plus size={16} className="mr-2" />
            빠른 입력
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_auto]">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={17}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="과목, 단원, 소개념, 요약노트, 문제, 정답, 해설, 키워드 검색"
              className="w-full rounded-2xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-zinc-500"
            />
          </label>
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setUnitFilter("");
            }}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 과목</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 단원/대주제</option>
            {unitsForFilter.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 상태</option>
            {data.settings.statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 중요도</option>
            <option value="5">5 이상</option>
            <option value="4">4 이상</option>
            <option value="3">3 이상</option>
          </select>
          <Button variant="outline" onClick={clearFilters}>
            <Filter size={16} className="mr-2" />
            초기화
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFavoriteOnly((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${favoriteOnly ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}
          >
            즐겨찾기만
          </button>
          <button
            onClick={() => setDueOnly((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${dueOnly ? "bg-blue-100 text-blue-800" : "bg-zinc-100 text-zinc-600"}`}
          >
            오늘 복습 대상
          </button>
          <button
            onClick={() => setWrongOnly((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${wrongOnly ? "bg-red-100 text-red-800" : "bg-zinc-100 text-zinc-600"}`}
          >
            오답 있는 문제
          </button>
          <Badge>소개념 {visibleConcepts.length}</Badge>
          {query.trim() && (
            <Badge tone="blue">검색 결과 {searchResults.length}</Badge>
          )}
        </div>
      </Card>

      {query.trim() && (
        <Card className="mb-5 p-5">
          <h3 className="mb-3 text-lg font-black">검색 결과</h3>
          {searchResults.length === 0 ? (
            <EmptyState
              title="검색 결과가 없습니다"
              description="검색어를 줄이거나 필터를 초기화해보세요."
            />
          ) : (
            <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() =>
                    result.type === "concept"
                      ? selectConcept(result.id)
                      : selectRecall(result.id)
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-left hover:border-zinc-400"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={result.type === "concept" ? "purple" : "blue"}>
                      {result.type === "concept" ? "소개념" : "문제"}
                    </Badge>
                    {result.isFavorite && (
                      <Star
                        size={15}
                        className="text-amber-500"
                        fill="currentColor"
                      />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-bold">
                    {result.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{result.path}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {data.settings.recentItems.length > 0 && (
        <Card className="mb-5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-black">
              <Clock size={17} />
              최근 본 항목
            </h3>
            <span className="text-xs font-semibold text-zinc-400">
              최대 10개
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.settings.recentItems.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  item.type === "concept"
                    ? selectConcept(item.targetId)
                    : selectRecall(item.targetId)
                }
                className="min-w-[220px] rounded-2xl border border-zinc-200 bg-white p-3 text-left hover:border-zinc-400"
              >
                <Badge tone={item.type === "concept" ? "purple" : "blue"}>
                  {item.type === "concept" ? "소개념" : "문제"}
                </Badge>
                <p className="mt-2 line-clamp-2 text-sm font-bold">
                  {item.title}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                  {item.path}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(760px,1fr)]">
        <div className="space-y-5">
          <Card className="p-5 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black">트리형 지식맵</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setExpandedSubjects(visibleSubjects);
                    setExpandedUnits(
                      visibleConcepts.map((c) => `${c.subject}|||${c.unit}`),
                    );
                    setExpandedConcepts(visibleConcepts.map((c) => c.id));
                  }}
                >
                  전체 펼치기
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setExpandedSubjects([]);
                    setExpandedUnits([]);
                    setExpandedConcepts([]);
                  }}
                >
                  전체 접기
                </Button>
              </div>
            </div>
            {visibleSubjects.length === 0 ? (
              <EmptyState
                title="표시할 항목이 없습니다"
                description="검색어 또는 필터 조건을 조정해 주세요."
              />
            ) : (
              <div className="space-y-3">
                {visibleSubjects.map((subjectName) => {
                  const subjectStats = statsForSubject(subjectName);
                  const subjectOpen = expandedSubjects.includes(subjectName);
                  const subjectConcepts = visibleConcepts.filter(
                    (c) => c.subject === subjectName,
                  );
                  const units = Array.from(
                    new Set(subjectConcepts.map((c) => c.unit)),
                  ).sort();
                  return (
                    <div
                      key={subjectName}
                      className="rounded-3xl border border-zinc-200 bg-white p-3"
                    >
                      <button
                        className="flex w-full items-center justify-between gap-3 rounded-2xl p-2 text-left hover:bg-zinc-50"
                        onClick={() =>
                          toggleList(subjectName, setExpandedSubjects)
                        }
                      >
                        <span className="flex items-center gap-2 font-black">
                          {subjectOpen ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}{" "}
                          {subjectName}
                        </span>
                        <span className="flex flex-wrap justify-end gap-2">
                          <Badge>단원 {subjectStats.units}</Badge>
                          <Badge>문제 {subjectStats.problems}</Badge>
                        </span>
                      </button>
                      {subjectOpen && (
                        <div className="ml-3 mt-2 space-y-2 border-l border-zinc-200 pl-3">
                          {units.map((unitName) => {
                            const unitKey = `${subjectName}|||${unitName}`;
                            const unitOpen = expandedUnits.includes(unitKey);
                            const unitStats = statsForUnit(
                              subjectName,
                              unitName,
                            );
                            const unitConcepts = subjectConcepts.filter(
                              (c) => c.unit === unitName,
                            );
                            return (
                              <div
                                key={unitKey}
                                className="rounded-2xl bg-zinc-50 p-2"
                              >
                                <button
                                  className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left hover:bg-white"
                                  onClick={() =>
                                    toggleList(unitKey, setExpandedUnits)
                                  }
                                >
                                  <span className="flex items-center gap-2 font-bold text-zinc-800">
                                    {unitOpen ? (
                                      <ChevronDown size={17} />
                                    ) : (
                                      <ChevronRight size={17} />
                                    )}{" "}
                                    {unitName || "단원/대주제 없음"}
                                  </span>
                                  <span className="flex flex-wrap justify-end gap-2">
                                    <Badge>소개념 {unitStats.concepts}</Badge>
                                    <Badge>문제 {unitStats.problems}</Badge>
                                  </span>
                                </button>
                                {unitOpen && (
                                  <div className="ml-4 mt-2 space-y-2 border-l border-zinc-200 pl-3">
                                    {unitConcepts.map((concept) => {
                                      const recalls =
                                        visibleRecallsForConcept(concept);
                                      const conceptOpen =
                                        expandedConcepts.includes(concept.id);
                                      return (
                                        <div
                                          key={concept.id}
                                          className={`rounded-2xl border p-2 ${selectedConceptId === concept.id ? "border-zinc-900 bg-white" : "border-zinc-200 bg-white"}`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <button
                                              className="min-w-0 flex-1 rounded-xl p-2 text-left hover:bg-zinc-50"
                                              onClick={() => {
                                                selectConcept(concept.id);
                                                toggleList(
                                                  concept.id,
                                                  setExpandedConcepts,
                                                );
                                              }}
                                            >
                                              <span className="flex items-center gap-2 font-bold">
                                                {conceptOpen ? (
                                                  <ChevronDown size={16} />
                                                ) : (
                                                  <ChevronRight size={16} />
                                                )}{" "}
                                                <span className="line-clamp-1">
                                                  {concept.title}
                                                </span>
                                              </span>
                                              <span className="mt-2 flex flex-wrap gap-2">
                                                <Badge>
                                                  문제 {recalls.length}
                                                </Badge>
                                                {concept.isFavorite && (
                                                  <Badge tone="amber">
                                                    즐겨찾기
                                                  </Badge>
                                                )}
                                              </span>
                                            </button>
                                            {renderFavoriteButton(
                                              concept.isFavorite,
                                              () =>
                                                toggleConceptFavorite(
                                                  concept.id,
                                                ),
                                            )}
                                          </div>
                                          {conceptOpen && (
                                            <div className="ml-6 mt-2 space-y-1 border-l border-zinc-200 pl-3">
                                              {recalls.length === 0 ? (
                                                <p className="px-2 py-2 text-xs text-zinc-400">
                                                  연결된 문제가 없습니다.
                                                </p>
                                              ) : (
                                                recalls.map((recall) => (
                                                  <div
                                                    key={recall.id}
                                                    className={`flex items-start justify-between gap-2 rounded-xl p-2 ${selectedRecallId === recall.id ? "bg-blue-50" : "hover:bg-zinc-50"}`}
                                                  >
                                                    <button
                                                      className="min-w-0 flex-1 text-left"
                                                      onClick={() =>
                                                        selectRecall(recall.id)
                                                      }
                                                    >
                                                      <p className="line-clamp-2 text-sm font-semibold text-zinc-700">
                                                        └ {recall.question}
                                                      </p>
                                                    </button>
                                                    {renderFavoriteButton(
                                                      recall.isFavorite,
                                                      () =>
                                                        toggleRecallFavorite(
                                                          recall.id,
                                                        ),
                                                      "문제 즐겨찾기",
                                                    )}
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {selectedConcept ? (
            <Card className="p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-zinc-500">
                    {selectedConcept.subject} &gt; {selectedConcept.unit}
                  </p>
                  <h3 className="mt-1 text-2xl font-black">
                    {selectedConcept.title}
                  </h3>
                </div>
                {renderFavoriteButton(selectedConcept.isFavorite, () =>
                  toggleConceptFavorite(selectedConcept.id),
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>문제 {selectedConceptProblems.length}</Badge>
                <Badge tone={selectedConcept.summaryNote ? "green" : "zinc"}>
                  {selectedConcept.summaryNote
                    ? "요약노트 있음"
                    : "요약노트 없음"}
                </Badge>
                <Badge>중요도 {selectedConcept.importance}</Badge>
              </div>
              <div className="mt-4">
                <SummaryNoteBox note={selectedConcept.summaryNote} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => startConceptStudy(selectedConcept.id)}>
                  <BookOpen size={16} className="mr-2" />
                  학습 시작
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    openQuickInput(
                      selectedConcept.subject,
                      selectedConcept.unit,
                      selectedConcept.title,
                      selectedConcept.id,
                    )
                  }
                >
                  <Plus size={16} className="mr-2" />
                  문제 추가
                </Button>
                <Button
                  variant="outline"
                  onClick={() => beginConceptEdit(selectedConcept)}
                >
                  <Edit3 size={16} className="mr-2" />
                  소개념 수정
                </Button>
                <Button
                  variant="danger"
                  onClick={() => deleteConcept(selectedConcept)}
                >
                  <Trash2 size={16} className="mr-2" />
                  소개념 삭제
                </Button>
              </div>

              {editingConcept && (
                <div className="mt-5 grid gap-3 rounded-3xl border border-zinc-200 p-4">
                  <Field
                    label="주제/소개념명"
                    value={conceptDraft.title || ""}
                    onChange={(v) =>
                      setConceptDraft({ ...conceptDraft, title: v, topic: v })
                    }
                  />
                  <Field
                    label="요약노트"
                    textarea
                    rows={8}
                    inputClassName="border-amber-200 bg-amber-50/70 leading-7 focus:border-amber-400"
                    value={conceptDraft.summaryNote || ""}
                    onChange={(v) =>
                      setConceptDraft({ ...conceptDraft, summaryNote: v })
                    }
                  />
                  <Field
                    label="설명"
                    textarea
                    value={conceptDraft.description || ""}
                    onChange={(v) =>
                      setConceptDraft({ ...conceptDraft, description: v })
                    }
                  />
                  <Field
                    label="키워드"
                    value={conceptDraft.keywords || ""}
                    onChange={(v) =>
                      setConceptDraft({ ...conceptDraft, keywords: v })
                    }
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveConceptEdit}>저장</Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingConcept(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-black">연결된 문제 목록</h4>
                  <span className="text-xs font-semibold text-zinc-400">
                    넓은 리스트형 보기
                  </span>
                </div>
                {selectedConceptProblems.length === 0 ? (
                  <EmptyState
                    title="연결된 문제가 없어요"
                    description="빠른 입력으로 이 소개념에 문제를 추가해보세요."
                  />
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
                    {selectedConceptProblems.map((recall, index) => (
                      <div
                        key={recall.id}
                        className={`border-t border-zinc-100 first:border-t-0 ${selectedRecallId === recall.id ? "bg-blue-50/70" : "bg-white"}`}
                      >
                        <div className="grid gap-3 p-4 lg:grid-cols-[82px_minmax(0,1fr)_auto] lg:items-start">
                          <button
                            className="text-left"
                            onClick={() => selectRecall(recall.id)}
                          >
                            <Badge
                              tone={
                                selectedRecallId === recall.id ? "blue" : "dark"
                              }
                            >
                              문제 {index + 1}
                            </Badge>
                          </button>
                          <button
                            className="min-w-0 text-left"
                            onClick={() => selectRecall(recall.id)}
                          >
                            <p className="whitespace-pre-wrap break-keep text-sm font-bold leading-7 text-zinc-900">
                              {recall.question}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {recall.isFavorite && (
                                <Badge tone="amber">즐겨찾기</Badge>
                              )}
                              {recall.type && <Badge>{recall.type}</Badge>}
                              {recall.importance ? (
                                <Badge>중요도 {recall.importance}</Badge>
                              ) : null}
                              {recall.wrongCount ? (
                                <Badge tone="red">
                                  오답 {recall.wrongCount}
                                </Badge>
                              ) : null}
                            </div>
                          </button>
                          <div className="flex flex-wrap justify-end gap-1">
                            {renderFavoriteButton(
                              recall.isFavorite,
                              () => toggleRecallFavorite(recall.id),
                              "문제 즐겨찾기",
                            )}
                            <button
                              onClick={() =>
                                setShowAnswers((prev) => ({
                                  ...prev,
                                  [recall.id]: !prev[recall.id],
                                }))
                              }
                              className="rounded-xl p-2 hover:bg-zinc-100"
                              title="정답 보기"
                            >
                              {showAnswers[recall.id] ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingProblemId(recall.id);
                                setProblemDraft(recall);
                              }}
                              className="rounded-xl p-2 hover:bg-zinc-100"
                              title="수정"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => deleteProblem(recall)}
                              className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {editingProblemId === recall.id ? (
                          <div className="mx-4 mb-4 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <Field
                              label="앞면(문제)"
                              textarea
                              value={problemDraft.question || ""}
                              onChange={(v) =>
                                setProblemDraft({
                                  ...problemDraft,
                                  question: v,
                                })
                              }
                            />
                            <Field
                              label="뒷면(답)-키워드"
                              textarea
                              value={problemDraft.answer || ""}
                              onChange={(v) =>
                                setProblemDraft({ ...problemDraft, answer: v })
                              }
                            />
                            <Field
                              label="해설"
                              textarea
                              value={problemDraft.explanation || ""}
                              onChange={(v) =>
                                setProblemDraft({
                                  ...problemDraft,
                                  explanation: v,
                                })
                              }
                            />
                            <div className="flex gap-2">
                              <Button onClick={saveProblemEdit}>
                                수정 저장
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setEditingProblemId("")}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          showAnswers[recall.id] && (
                            <div className="mx-4 mb-4 rounded-2xl bg-zinc-50 p-4">
                              <p className="text-xs font-bold text-zinc-500">
                                정답
                              </p>
                              <p className="mt-1 whitespace-pre-wrap break-keep text-sm leading-7">
                                {recall.answer}
                              </p>
                              {recall.explanation && (
                                <p className="mt-3 whitespace-pre-wrap break-keep text-sm leading-7 text-zinc-500">
                                  해설: {recall.explanation}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <EmptyState
                title="선택된 주제/소개념이 없습니다"
                description="왼쪽 트리에서 소개념을 선택하면 요약노트와 문제 목록이 표시돼요."
              />
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-3 text-lg font-black">분류명 정리</h3>
            <div className="space-y-3">
              <select
                value={renameSubjectFrom}
                onChange={(e) => setRenameSubjectFrom(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">변경할 과목 선택</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <Field
                label="새 과목명"
                value={renameSubjectTo}
                onChange={setRenameSubjectTo}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={renameSubject}
              >
                과목명 일괄 변경
              </Button>
              <div className="my-4 border-t border-zinc-200" />
              <select
                value={renameUnitFrom}
                onChange={(e) => setRenameUnitFrom(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">변경할 단원/대주제 선택</option>
                {Array.from(
                  new Set(data.concepts.map((c) => `${c.subject}|||${c.unit}`)),
                ).map((key) => {
                  const [subjectName, unitName] = key.split("|||");
                  return (
                    <option key={key} value={key}>
                      {subjectName} &gt; {unitName}
                    </option>
                  );
                })}
              </select>
              <Field
                label="새 단원/대주제명"
                value={renameUnitTo}
                onChange={setRenameUnitTo}
              />
              <Button variant="outline" className="w-full" onClick={renameUnit}>
                단원/대주제명 일괄 변경
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
