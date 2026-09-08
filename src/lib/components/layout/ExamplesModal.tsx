import React from 'react';
import { PRELOADED_EXAMPLES } from '../../model/examples';
import { LPModel } from '../../solver/types';
import { useI18n } from '../../i18n';
import { BookOpen, X, ArrowRight, Layers } from 'lucide-react';

interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: LPModel) => void;
}

export const ExamplesModal: React.FC<ExamplesModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {t('modal.examplesTitle')}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('modal.examplesSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Examples Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {PRELOADED_EXAMPLES.map((ex) => (
            <div
              key={ex.id}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between gap-3 group"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition">
                    {ex.name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {ex.variables.some((v) => v.type === 'binary')
                      ? '0-1 Binario'
                      : ex.variables.some((v) => v.type === 'integer')
                      ? 'MILP Entero'
                      : 'LP Continuo'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {ex.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-600 font-mono text-[11px]">
                  {ex.variables.length} vars × {ex.constraints.length} rest.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ex);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <span>{t('modal.load')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
