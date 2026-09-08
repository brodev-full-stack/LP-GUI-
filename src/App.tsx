import React, { useState, useEffect, useCallback, useRef } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import { LPModel, SolveResult } from './lib/solver/types';
import { solveLP } from './lib/solver';
import { PRELOADED_EXAMPLES } from './lib/model/examples';
import { createEmptyModel } from './lib/model';
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

// Visualization & Results
import { FeasibleRegion } from './lib/viz/feasible-region';
import { MultivarViz } from './lib/viz/multivar-viz';
import { SolutionPanel } from './lib/components/results/SolutionPanel';

import { Edit3, Play, FileCode2, Compass, BarChart2, GripVertical } from 'lucide-react';

const LAST_MODEL_KEY = 'last_active_model_id';
const SPLIT_RATIO_KEY = 'desktop_split_ratio';

type MobileTab = 'editor' | 'viz' | 'results';

const AppContent: React.FC = () => {
  const { t, formatDate } = useI18n();

  // Model & solution state
  const [model, setModel] = useState<LPModel>(PRELOADED_EXAMPLES[0]);
  const [solution, setSolution] = useState<SolveResult | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

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
            solve(saved);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load cached preferences, using defaults', err);
      }
      solve(PRELOADED_EXAMPLES[0]);
    }
    initModelAndPreferences();
  }, []);

  const solve = async (modelToSolve: LPModel) => {
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
    const empty = createEmptyModel('Nuevo Modelo LP');
    setModel(empty);
    setSolution(null);
    saveModel(empty);
    savePreference(LAST_MODEL_KEY, empty.id);
  };

  const handleSelectModel = (selected: LPModel) => {
    setModel(selected);
    savePreference(LAST_MODEL_KEY, selected.id);
    solve(selected);
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
    <div className="min-h-screen flex flex-col justify-between swiss-grid-subtle">
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
                className="text-base sm:text-lg font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-blue-500 outline-hidden"
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
                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
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
              disabled={isSolving}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSolving ? t('editor.solving') : t('editor.solve')}</span>
            </button>
          </div>
        </div>

        {/* Real-time Inline Model Warnings */}
        <ValidationBar model={model} />

        {/* Mobile Segmented Navigation Tabs (< lg screens) */}
        <div className="lg:hidden no-print bg-slate-200/80 p-1 rounded-lg flex items-center text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition cursor-pointer ${
              mobileTab === 'editor'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{t('mobile.tabEditor')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('viz')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition cursor-pointer ${
              mobileTab === 'viz'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t('mobile.tabViz')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('results')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition cursor-pointer ${
              mobileTab === 'results'
                ? 'bg-white text-blue-700 shadow-2xs'
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
              <ObjectiveForm model={model} onChange={handleModelChange} />
              <VariableTable model={model} onChange={handleModelChange} />
              <ConstraintTable model={model} onChange={handleModelChange} />
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
            <ObjectiveForm model={model} onChange={handleModelChange} />
            <VariableTable model={model} onChange={handleModelChange} />
            <ConstraintTable model={model} onChange={handleModelChange} />
          </div>

          {/* Draggable Divider Bar */}
          <div
            onMouseDown={handleSplitMouseDown}
            onTouchStart={handleSplitTouchStart}
            onDoubleClick={handleSplitDoubleClick}
            title={t('editor.splitDrag')}
            className={`w-3 mx-1 self-stretch flex items-center justify-center splitter-handle rounded transition-colors group cursor-col-resize ${
              isDraggingSplit ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 text-slate-400'
            }`}
          >
            <div className="h-10 w-1.5 flex flex-col items-center justify-center gap-1 rounded bg-slate-300 group-hover:bg-blue-600 transition-colors">
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
