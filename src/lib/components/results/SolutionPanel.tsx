import React, { useState } from 'react';
import { SolveResult, LPModel, VariableResult } from '../../solver/types';
import { StatusBanner } from './StatusBanner';
import { SensitivityPanel } from '../../viz/sensitivity';
import { useI18n } from '../../i18n';
import { CheckCircle2, AlertCircle, Layers, Sliders, TableProperties } from 'lucide-react';

interface SolutionPanelProps {
  model: LPModel;
  solution?: SolveResult | null;
  isSolving?: boolean;
}

export const SolutionPanel: React.FC<SolutionPanelProps> = ({ model, solution, isSolving }) => {
  const { t, formatNumber } = useI18n();
  const [activeTab, setActiveTab] = useState<'summary' | 'sensitivity'>('summary');

  if (isSolving) {
    return (
      <div className="liquid-card rounded-2xl p-8 border border-white/80 shadow-xs flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-800 text-sm">{t('editor.solving')}</span>
        <span className="text-xs text-slate-600">Calculando solución óptima con HiGHS WASM...</span>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="liquid-card rounded-2xl p-8 border border-white/80 shadow-xs flex flex-col items-center justify-center gap-2 text-center text-slate-600">
        <TableProperties className="w-8 h-8 text-slate-400 stroke-1" />
        <p className="text-xs max-w-md leading-relaxed">{t('results.empty')}</p>
      </div>
    );
  }

  return (
    <div id="solution-panel-container" className="flex flex-col gap-4">
      {/* Banner */}
      <StatusBanner result={solution} />

      {solution.status === 'Optimal' && (
        <div className="liquid-card rounded-2xl p-5 border border-white/80 shadow-xs flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('results.variablesSummary')} & Restricciones</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sensitivity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === 'sensitivity'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{t('sensitivity.title')}</span>
              </button>
            </div>
          </div>

          {activeTab === 'summary' && (
            <div className="flex flex-col gap-5">
              {/* Variables Table */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {t('results.variablesSummary')}
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white/70">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/70">
                        <th scope="col" className="py-2.5 px-3">Variable</th>
                        <th scope="col" className="py-2.5 px-3">Tipo</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">Valor Óptimo</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.reducedCost')}</th>
                        <th scope="col" className="py-2.5 px-3">Límites</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 font-mono">
                      {(Object.values(solution.columns) as VariableResult[]).map((col) => (
                        <tr key={`res-col-${col.varId}`} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">{col.name}</td>
                          <td className="py-2 px-3 font-sans text-slate-600 capitalize">{col.type}</td>
                          <td className="py-2 px-3 font-bold text-blue-700 text-sm">
                            {formatNumber(col.value)}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {formatNumber(col.reducedCost)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                            [{col.lowerBound !== null ? formatNumber(col.lowerBound) : '-∞'},{' '}
                            {col.upperBound !== null ? formatNumber(col.upperBound) : '+∞'}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Constraints Table */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {t('results.constraintsSummary')}
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white/70">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/70">
                        <th scope="col" className="py-2.5 px-3">Restricción</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">LHS</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">RHS</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.slackSurplus')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.dualPrice')}</th>
                        <th scope="col" className="py-2.5 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 font-mono">
                      {solution.rows.map((row) => (
                        <tr key={`res-row-${row.id}`} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">{row.name}</td>
                          <td className="py-2 px-3 text-slate-800">{formatNumber(row.lhsValue)}</td>
                          <td className="py-2 px-3 text-slate-600">{formatNumber(row.rhs)}</td>
                          <td className="py-2 px-3 text-slate-700">{formatNumber(row.slack)}</td>
                          <td className="py-2 px-3 font-medium text-indigo-700">
                            {formatNumber(row.dualPrice)}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {row.isBinding ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                {t('results.binding')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                {t('results.nonBinding')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sensitivity' && (
            <SensitivityPanel solution={solution} />
          )}
        </div>
      )}
    </div>
  );
};
