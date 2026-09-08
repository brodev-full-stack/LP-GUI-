import React, { useState } from 'react';
import { useI18n, SupportedLocale } from '../../i18n';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import {
  FolderOpen,
  BookOpen,
  Info,
  Download,
  Globe,
  PlusCircle,
  FilePlus,
  Save,
  Play,
  Check,
} from 'lucide-react';

interface TopBarProps {
  onOpenSaved: () => void;
  onOpenExamples: () => void;
  onOpenAbout: () => void;
  onOpenExport: () => void;
  onNewModel: () => void;
  onSolve: () => void;
  onSave: () => void;
  isSolving?: boolean;
  isSaved?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSaved,
  onOpenExamples,
  onOpenAbout,
  onOpenExport,
  onNewModel,
  onSolve,
  onSave,
  isSolving,
  isSaved,
}) => {
  const { t, locale, setLocale, languages } = useI18n();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center text-white font-mono font-bold text-xs tracking-tight shadow-sm shadow-indigo-500/20">
            LP
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                {t('app.title')}
              </h1>
              <span className="hidden md:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                HiGHS WASM + LINGO
              </span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline-block">
              {t('app.subtitle')}
            </span>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Solve Button Primary */}
          <button
            type="button"
            id="solve-model-button"
            onClick={onSolve}
            disabled={isSolving}
            className="m3-gradient-btn flex items-center gap-1.5 px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSolving ? t('editor.solving') : t('editor.solve')}</span>
          </button>

          {/* Quick Save button */}
          <button
            type="button"
            id="save-model-button"
            onClick={onSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            title="Ctrl+S"
          >
            {isSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Save className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">
              {isSaved ? t('editor.saved') : t('editor.save')}
            </span>
          </button>

          {/* New Model */}
          <button
            type="button"
            onClick={onNewModel}
            className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            title={t('nav.newModel')}
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('nav.newModel')}</span>
          </button>

          {/* Examples button */}
          <button
            type="button"
            onClick={onOpenExamples}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            title={t('nav.examples')}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">{t('nav.examples')}</span>
          </button>

          {/* Saved Models button */}
          <button
            type="button"
            onClick={onOpenSaved}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            title={t('nav.savedModels')}
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">{t('nav.savedModels')}</span>
          </button>

          {/* Export / Import */}
          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            title={t('export.title')}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden lg:inline">{t('nav.export')}</span>
          </button>

          {/* Documentation */}
          <button
            type="button"
            onClick={onOpenAbout}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            title={t('nav.about')}
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline ml-1">{t('nav.about')}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer uppercase"
              title="Switch language"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>{locale}</span>
            </button>

            {langDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/90 z-50 animate-in fade-in duration-100"
                onClick={() => setLangDropdownOpen(false)}
              >
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code as SupportedLocale)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition cursor-pointer ${
                      locale === l.code
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{l.nativeName}</span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{l.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
