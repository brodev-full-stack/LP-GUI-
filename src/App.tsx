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

import { Edit3, Play, Save, Check } from 'lucide-react';

const LAST_MODEL_KEY = 'last_active_model_id';

const AppContent: React.FC = () => {
  const { t, formatDate } = useI18n();

  // Model & solution state
  const [model, setModel] = useState<LPModel>(PRELOADED_EXAMPLES[0]);
  const [solution, setSolution] = useState<SolveResult | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Modal open states
  const [examplesModalOpen, setExamplesModalOpen] = useState<boolean>(false);
  const [savedModalOpen, setSavedModalOpen] = useState<boolean>(false);
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Editing model name inline
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Load last active model from IndexedDB on startup
  useEffect(() => {
    async function initModel() {
      try {
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
        console.warn('Could not load cached model, using default', err);
      }
      // Solve initial default model immediately
      solve(PRELOADED_EXAMPLES[0]);
    }
    initModel();
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
    // Auto-save model ID
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter: Solve
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSolve();
      }
      // Ctrl+S or Cmd+S: Save
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Printable Executive Header (Only visible on window.print()) */}
        <div className="hidden print-only border-b border-slate-300 pb-4 mb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{model.name}</h1>
              <p className="text-xs text-slate-600">Informe de Optimización Lineal - LP Studio</p>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Fecha: {formatDate(Date.now())}
            </div>
          </div>
        </div>

        {/* Model Title & Inline Edit Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
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
                className="text-lg sm:text-xl font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-blue-400 outline-hidden"
              />
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-2 cursor-pointer"
                title="Haga clic para editar el nombre del modelo"
              >
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {model.name}
                </h2>
                <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </div>
            )}

            <span className="text-xs text-slate-600 font-mono hidden sm:inline">
              ({model.variables.length} vars, {model.constraints.length} rest.)
            </span>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={handleSolve}
              disabled={isSolving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-sm hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSolving ? t('editor.solving') : t('editor.solve')}</span>
            </button>
          </div>
        </div>

        {/* Real-time Inline Model Warnings */}
        <ValidationBar model={model} />

        {/* Responsive Two-Column Swiss Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Formulation & Model Editor (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Objective Function */}
            <ObjectiveForm model={model} onChange={handleModelChange} />

            {/* Decision Variables Table */}
            <VariableTable model={model} onChange={handleModelChange} />

            {/* Constraints Table */}
            <ConstraintTable model={model} onChange={handleModelChange} />
          </div>

          {/* Right Column: Visualization & Results (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* 2D Feasible Region Plot if 2 variables */}
            {model.variables.length === 2 && (
              <FeasibleRegion
                model={model}
                solution={solution}
                isSolving={isSolving}
              />
            )}

            {/* Multivariable Resource Breakdown if > 2 variables */}
            {model.variables.length > 2 && (
              <MultivarViz
                model={model}
                solution={solution}
              />
            )}

            {/* Solution & Sensitivity Analysis Panel */}
            <SolutionPanel
              model={model}
              solution={solution}
              isSolving={isSolving}
            />
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
