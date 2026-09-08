import React, { useState } from 'react';
import { SolveResult, LPModel, VariableResult } from '../../solver/types';
import { StatusBanner } from './StatusBanner';
import { SensitivityPanel } from '../../viz/sensitivity';
import { useI18n } from '../../i18n';
import { CheckCircle2, AlertCircle, BarChart2, Sliders, Hash } from 'lucide-react';

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
      <div className="swiss-card p-6 flex flex-col items-center justify-center gap-3 min-h-[220px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
        <span className="text-xs font-mono text-slate-600">{t('editor.solving')}</span>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="swiss-card p-8 flex flex-col items-center justify-center gap-3 min-h-[220px] text-center">
        <Hash className="w-8 h-8 text-slate-400 stroke-1" />
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          {t('results.empty')}
        </p>
      </div>
    );
  }

  const columnsList = Object.values(solution.columns || {}) as VariableResult[];

  return (
    <div id="solution-panel-container" className="flex flex-col gap-4">
      {/* Highs Status Banner */}
      <StatusBanner solution={solution} />

      {/* If optimal, render full solution & sensitivity */}
      {solution.status === 'Optimal' && (
        <div className="swiss-card p-5 flex flex-col gap-5">
          {/* Header & Segmented Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
              {t('results.title')}
            </h3>

            {/* Segmented control */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{t('results.tabSolution')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sensitivity')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeTab === 'sensitivity'
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{t('results.tabSensitivity')}</span>
              </button>
            </div>
          </div>

          {activeTab === 'summary' && (
            <div className="flex flex-col gap-5">
              {/* Variables Table */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  {t('results.variablesSummary')}
                </span>
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th scope="col" className="py-2.5 px-3">{t('results.tableVar')}</th>
                        <th scope="col" className="py-2.5 px-3">{t('results.tableType')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableOptimalValue')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableReducedCost')}</th>
                        <th scope="col" className="py-2.5 px-3">{t('results.tableBounds')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {columnsList.map((col) => (
                        <tr key={`res-col-${col.varId}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-sans font-semibold text-slate-900">{col.name}</td>
                          <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                            {col.type === 'binary'
                              ? t('editor.typeBinary')
                              : col.type === 'integer'
                              ? t('editor.typeInteger')
                              : t('editor.typeContinuous')}
                          </td>
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
                <span className="text-xs font-semibold text-slate-900">
                  {t('results.constraintsSummary')}
                </span>
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th scope="col" className="py-2.5 px-3">{t('results.tableConstraint')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableLhs')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableRhs')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableSlack')}</th>
                        <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableDualPrice')}</th>
                        <th scope="col" className="py-2.5 px-3">{t('results.tableStatus')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(solution.rows || []).map((row) => (
                        <tr key={`res-row-${row.id}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-sans font-medium text-slate-900">{row.name}</td>
                          <td className="py-2 px-3 text-slate-800">{formatNumber(row.lhsValue)}</td>
                          <td className="py-2 px-3 text-slate-600">{formatNumber(row.rhs)}</td>
                          <td className="py-2 px-3 text-slate-700">{formatNumber(row.slack)}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {formatNumber(row.dualPrice)}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {row.isBinding ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-700" />
                                {t('results.binding')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
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
