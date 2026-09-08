import React from 'react';
import { LPModel, ObjectiveDirection } from '../../solver/types';
import { useI18n } from '../../i18n';
import { Target, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface ObjectiveFormProps {
  model: LPModel;
  onChange: (updatedModel: LPModel) => void;
}

export const ObjectiveForm: React.FC<ObjectiveFormProps> = ({ model, onChange }) => {
  const { t, formatNumber } = useI18n();

  const setDirection = (direction: ObjectiveDirection) => {
    onChange({
      ...model,
      objective: {
        ...model.objective,
        direction,
      },
    });
  };

  const setCoefficient = (varId: string, value: number) => {
    onChange({
      ...model,
      objective: {
        ...model.objective,
        terms: {
          ...model.objective.terms,
          [varId]: value,
        },
      },
    });
  };

  // Generate live math preview string
  const termsPreview = model.variables
    .map((v) => {
      const coeff = model.objective.terms[v.id] ?? 0;
      if (coeff === 0) return null;
      const sign = coeff >= 0 ? '+' : '-';
      const absVal = Math.abs(coeff);
      const coeffStr = absVal === 1 ? '' : `${formatNumber(absVal)} `;
      return { sign, text: `${coeffStr}${v.name}` };
    })
    .filter(Boolean);

  let mathPreview = `${model.objective.direction === 'maximize' ? 'Max' : 'Min'} Z = `;
  if (termsPreview.length === 0) {
    mathPreview += '0';
  } else {
    const formatted = termsPreview.map((item, idx) => {
      if (idx === 0) {
        return item!.sign === '-' ? `-${item!.text}` : item!.text;
      }
      return `${item!.sign} ${item!.text}`;
    }).join(' ');
    mathPreview += formatted;
  }

  return (
    <div id="objective-editor-card" className="liquid-card rounded-2xl p-4 md:p-5 border border-white/80 shadow-xs flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm tracking-tight">
            {t('editor.objective')}
          </h3>
        </div>

        {/* Min / Max Toggle */}
        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setDirection('maximize')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              model.objective.direction === 'maximize'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {t('editor.maximize')}
          </button>
          <button
            type="button"
            onClick={() => setDirection('minimize')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              model.objective.direction === 'minimize'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            {t('editor.minimize')}
          </button>
        </div>
      </div>

      {/* Structured Terms Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {model.variables.map((v) => {
          const currentCoeff = model.objective.terms[v.id] ?? 0;
          return (
            <div
              key={`obj-term-${v.id}`}
              className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-slate-200/70 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition"
            >
              <input
                type="number"
                step="any"
                value={currentCoeff === 0 ? '' : currentCoeff}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setCoefficient(v.id, isNaN(val) ? 0 : val);
                }}
                className="w-full text-right font-mono font-medium text-sm text-slate-800 bg-transparent outline-hidden px-1"
              />
              <span className="font-mono font-semibold text-xs text-blue-600 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/50 shrink-0">
                {v.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Math Preview Box */}
      <div className="px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/50 text-xs font-mono text-slate-700 flex items-center justify-between gap-2 overflow-x-auto">
        <span className="text-slate-600 text-[11px] font-sans shrink-0">Notación:</span>
        <span className="font-semibold text-blue-900 truncate">{mathPreview}</span>
      </div>
    </div>
  );
};
