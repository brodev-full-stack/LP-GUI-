import React, { useState, useEffect, useCallback, useRef } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import { LPModel, SolveResult } from './lib/solver/types';
import { solveLP } from './lib/solver';
import { PRELOADED_EXAMPLES } from './lib/model/examples';
import { createEmptyModel, createZeroModel } from './lib/model';
import { saveModel, getModel, savePreference, getPreference } from './lib/storage';

// Layout & UI Components
import { TopBar } from './lib/components/layout/TopBar';
import { StatusBar } from './lib/components/layout/StatusBar';
import { ExamplesModal } from './lib/components/layout/ExamplesModal';
import { SavedModelsModal } from './lib/components/layout/SavedModelsModal';
import { AboutModal } from './lib/components/layout/AboutModal';
import { ExportModal } from './lib/components/layout/ExportModal';

// Model Editor Components
import { ObjectiveForm } from './lib/components/model-editor/ObjectiveForm';
import { VariableTable } from './lib/components/model-editor/VariableTable';
import { ConstraintTable } from './lib/components/model-editor/ConstraintTable';
import { ValidationBar } from './lib/components/model-editor/ValidationBar';
import { LingoEditor } from './lib/components/editor/LingoEditor';

// Visualization & Results
import { FeasibleRegion } from './lib/viz/feasible-region';
import { MultivarViz } from './lib/viz/multivar-viz';
import { SolutionPanel } from './lib/components/results/SolutionPanel';

import {
  Edit3,
  Play,
  FileCode2,
  Compass,
  BarChart2,
  SlidersHorizontal,
  Code2,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';

const LAST_MODEL_KEY = 'last_active_model_id';
const SPLIT_RATIO_KEY = 'desktop_split_ratio';

type MobileTab = 'editor' | 'viz' | 'results';
type EditorMode = 'visual' | 'lingo';

const AppContent: React.FC = () => {
  const { t, formatDate } = useI18n();

  // Model & solution state - starts completely from zero
  const [model, setModel] = useState<LPModel>(() => createZeroModel('Nuevo Modelo LP'));
  const [solution, setSolution] = useState<SolveResult | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Editor mode: Form-based or LINGO syntax
  const [editorMode, setEditorMode] = useState<EditorMode>('visual');

  // Mobile navigation tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');

  // Desktop resizable split ratio (% of left editor pane, default 54%)
  const [splitRatio, setSplitRatio] = useState<number>(54);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Modal open states
  const [examplesModalOpen, setExamplesModalOpen] = useState<boolean>(false);
  const [savedModalOpen, setSavedModalOpen] = useState<boolean>(false);
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Editing model name inline
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Load last active model & split ratio from storage
  useEffect(() => {
    async function initModelAndPreferences() {
      try {
        const savedSplit = await getPreference<number>(SPLIT_RATIO_KEY, 54);
        if (savedSplit && savedSplit >= 30 && savedSplit <= 70) {
          setSplitRatio(savedSplit);
        }

        const lastId = await getPreference<string>(LAST_MODEL_KEY, '');
        if (lastId) {
          const saved = await getModel(lastId);
          if (saved) {
            setModel(saved);
            if (saved.variables.length > 0) {
              solve(saved);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load cached preferences, using defaults', err);
      }
      // Start completely empty with zero pre-populated variables/constraints
      const zero = createZeroModel('Nuevo Modelo LP');
      setModel(zero);
      setSolution(null);
    }
    initModelAndPreferences();
  }, []);

  const solve = async (modelToSolve: LPModel) => {
    if (!modelToSolve.variables || modelToSolve.variables.length === 0) {
      setSolution(null);
      return;
    }
    setIsSolving(true);
    try {
      const res = await solveLP(modelToSolve);
      setSolution(res);
    } catch (err) {
      console.error('Solver failed:', err);
    } finally {
      setIsSolving(false);
    }
  };

  const handleSolve = () => {
    solve(model);
  };

  const handleSave = async () => {
    const updated = {
      ...model,
      updatedAt: Date.now(),
    };
    await saveModel(updated);
    await savePreference(LAST_MODEL_KEY, updated.id);
    setModel(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleModelChange = (updatedModel: LPModel) => {
    setModel(updatedModel);
    savePreference(LAST_MODEL_KEY, updatedModel.id);
  };

  const handleNewModel = () => {
    const empty = createZeroModel('Nuevo Modelo LP');
    setModel(empty);
    setSolution(null);
    saveModel(empty);
    savePreference(LAST_MODEL_KEY, empty.id);
  };

  const handleSelectModel = (selected: LPModel) => {
    setModel(selected);
    savePreference(LAST_MODEL_KEY, selected.id);
    if (selected.variables.length > 0) {
      solve(selected);
    } else {
      setSolution(null);
    }
  };

  // Draggable Split Divider Logic
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleSplitTouchStart = (e: React.TouchEvent) => {
    setIsDraggingSplit(true);
  };

  const handleSplitDoubleClick = () => {
    setSplitRatio(54);
    savePreference(SPLIT_RATIO_KEY, 54);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(72, Math.max(28, Math.round(newRatio)));
      setSplitRatio(clamped);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingSplit || !containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.touches[0].clientX;
      const newRatio = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(72, Math.max(28, Math.round(newRatio)));
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      if (isDraggingSplit) {
        setIsDraggingSplit(false);
        savePreference(SPLIT_RATIO_KEY, splitRatio);
      }
    };

    if (isDraggingSplit) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSplit, splitRatio]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSolve();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [model]);

  return (
    <div className="min-h-screen flex flex-col justify-between m3-surface">
      {/* Top Navigation */}
      <div className="no-print">
        <TopBar
          onOpenSaved={() => setSavedModalOpen(true)}
          onOpenExamples={() => setExamplesModalOpen(true)}
          onOpenAbout={() => setAboutModalOpen(true)}
          onOpenExport={() => setExportModalOpen(true)}
          onNewModel={handleNewModel}
          onSolve={handleSolve}
          onSave={handleSave}
          isSolving={isSolving}
          isSaved={isSaved}
        />
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Printable Executive Header */}
        <div className="hidden print-only border-b border-slate-300 pb-4 mb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{model.name}</h1>
              <p className="text-xs text-slate-600">{t('print.reportSubtitle')}</p>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              {t('print.date')}: {formatDate(Date.now())}
            </div>
          </div>
        </div>

        {/* Model Title & Quick Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-1">
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <input
                type="text"
                value={model.name}
                autoFocus
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingName(false);
                }}
                onChange={(e) => handleModelChange({ ...model, name: e.target.value })}
                className="text-base sm:text-lg font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-xl border border-indigo-500 outline-hidden shadow-2xs"
              />
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-2 cursor-pointer"
                title={model.name}
              >
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {model.name}
                </h2>
                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
              </div>
            )}

            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              ({model.variables.length} vars, {model.constraints.length} rest.)
            </span>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={handleSolve}
              disabled={isSolving || model.variables.length === 0}
              className="m3-gradient-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSolving ? t('editor.solving') : t('editor.solve')}</span>
            </button>
          </div>
        </div>

        {/* Real-time Inline Model Warnings */}
        <ValidationBar model={model} />

        {/* Mobile Segmented Navigation Tabs (< lg screens) */}
        <div className="lg:hidden no-print bg-slate-200/70 p-1 rounded-2xl flex items-center text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition cursor-pointer ${
              mobileTab === 'editor'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{t('mobile.tabEditor')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('viz')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition cursor-pointer ${
              mobileTab === 'viz'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t('mobile.tabViz')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('results')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition cursor-pointer ${
              mobileTab === 'results'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{t('mobile.tabResults')}</span>
            {solution?.status === 'Optimal' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Mobile View: Render only active tab */}
        <div className="lg:hidden flex flex-col gap-4">
          {mobileTab === 'editor' && (
            <div className="flex flex-col gap-4">
              {/* Mode switch */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-xl transition ${
                    editorMode === 'visual'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Formularios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('lingo')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-xl transition ${
                    editorMode === 'lingo'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>LINGO / TXT</span>
                </button>
              </div>

              {editorMode === 'visual' ? (
                <>
                  <ObjectiveForm model={model} onChange={handleModelChange} />
                  <VariableTable model={model} onChange={handleModelChange} />
                  <ConstraintTable model={model} onChange={handleModelChange} />
                </>
              ) : (
                <LingoEditor model={model} onModelChange={handleModelChange} onSolve={handleSolve} />
              )}
            </div>
          )}

          {mobileTab === 'viz' && (
            <div className="flex flex-col gap-4">
              {model.variables.length === 2 && (
                <FeasibleRegion model={model} solution={solution} isSolving={isSolving} />
              )}
              {model.variables.length > 2 && (
                <MultivarViz model={model} solution={solution} />
              )}
              {model.variables.length < 2 && (
                <div className="m3-card p-6 flex flex-col items-center justify-center text-center gap-3 bg-white border border-slate-200/90">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lienzo Inicial Vacío
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Define variables y restricciones en el editor para generar la región factible y gráficas en tiempo real.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMobileTab('editor')}
                    className="mt-1 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Ir al Editor
                  </button>
                </div>
              )}
            </div>
          )}

          {mobileTab === 'results' && (
            <div className="flex flex-col gap-4">
              <SolutionPanel model={model} solution={solution} isSolving={isSolving} />
            </div>
          )}
        </div>

        {/* Desktop View: Draggable Resizable Split Pane (>= lg screens) */}
        <div
          ref={containerRef}
          className="hidden lg:flex w-full items-start gap-0 relative select-none"
        >
          {/* Left Column: Formulation & Model Editor */}
          <div
            style={{ width: `${splitRatio}%` }}
            className="flex flex-col gap-4 pr-3 shrink-0 overflow-y-auto"
          >
            {/* Structured vs LINGO Mode Switch */}
            <div className="flex items-center justify-between gap-2 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setEditorMode('visual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  editorMode === 'visual'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Formularios Estructurados</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('lingo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  editorMode === 'lingo'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Sintaxis LINGO / TXT</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v18+
                </span>
              </button>
            </div>

            {editorMode === 'visual' ? (
              <>
                <ObjectiveForm model={model} onChange={handleModelChange} />
                <VariableTable model={model} onChange={handleModelChange} />
                <ConstraintTable model={model} onChange={handleModelChange} />
              </>
            ) : (
              <LingoEditor model={model} onModelChange={handleModelChange} onSolve={handleSolve} />
            )}
          </div>

          {/* Draggable Divider Bar */}
          <div
            onMouseDown={handleSplitMouseDown}
            onTouchStart={handleSplitTouchStart}
            onDoubleClick={handleSplitDoubleClick}
            title={t('editor.splitDrag')}
            className={`w-3 mx-1 self-stretch flex items-center justify-center splitter-handle rounded-full transition-colors group cursor-col-resize ${
              isDraggingSplit ? 'bg-indigo-500 text-white' : 'hover:bg-slate-200 text-slate-400'
            }`}
          >
            <div className="h-10 w-1.5 flex flex-col items-center justify-center gap-1 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors">
              <span className="w-0.5 h-0.5 rounded-full bg-white" />
              <span className="w-0.5 h-0.5 rounded-full bg-white" />
              <span className="w-0.5 h-0.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Right Column: Visualization & Results */}
          <div
            style={{ width: `calc(${100 - splitRatio}% - 20px)` }}
            className="flex flex-col gap-4 pl-3 shrink-0 overflow-y-auto"
          >
            {model.variables.length === 2 && (
              <FeasibleRegion model={model} solution={solution} isSolving={isSolving} />
            )}

            {model.variables.length > 2 && (
              <MultivarViz model={model} solution={solution} />
            )}

            {model.variables.length < 2 && (
              <div className="m3-card p-6 md:p-8 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-b from-white to-indigo-50/20 border border-slate-200/90 shadow-sm">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Lienzo de Optimización Listo
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Comienza desde cero agregando variables y restricciones en el panel izquierdo, o escribe directamente en sintaxis LINGO.
                    Al definir 2 variables se activará la región geométrica interactiva en 2D, y con 3 o más variables el radar multivariable.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setExamplesModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ver Ejemplos de Referencia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('lingo')}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Escribir en LINGO</span>
                  </button>
                </div>
              </div>
            )}

            <SolutionPanel model={model} solution={solution} isSolving={isSolving} />
          </div>
        </div>
      </main>

      {/* Bottom Status Bar */}
      <div className="no-print">
        <StatusBar model={model} solution={solution} isSolving={isSolving} />
      </div>

      {/* Modals */}
      <ExamplesModal
        isOpen={examplesModalOpen}
        onClose={() => setExamplesModalOpen(false)}
        onSelect={handleSelectModel}
      />

      <SavedModelsModal
        isOpen={savedModalOpen}
        onClose={() => setSavedModalOpen(false)}
        onSelect={handleSelectModel}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        model={model}
        solution={solution}
        onImport={handleSelectModel}
      />
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
