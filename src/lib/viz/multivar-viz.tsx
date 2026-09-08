import React from 'react';
import { LPModel, SolveResult, VariableResult } from '../solver/types';
import { useI18n } from '../i18n';
import { BarChart3, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface MultivarVizProps {
  model: LPModel;
  solution?: SolveResult | null;
}

export const MultivarViz: React.FC<MultivarVizProps> = ({ model, solution }) => {
  const { t, formatNumber } = useI18n();

  if (!solution || solution.status !== 'Optimal') return null;

  const maxVarVal = Math.max(1, ...(Object.values(solution.columns) as VariableResult[]).map((c) => Math.abs(c.value)));

  return (
    <div id="multivar-viz-container" className="flex flex-col gap-4">
      {/* Notice card if > 2 variables */}
      {model.variables.length > 2 && (
        <div className="bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{t('viz.noticeMultivar')}</p>
        </div>
      )}

      {/* Variables Values Chart */}
      <div className="swiss-card p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-slate-900 text-sm">
            {t('results.variablesSummary')}
          </h4>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          {model.variables.map((v) => {
            const col = solution.columns[v.id];
            const val = col ? col.value : 0;
            const pct = Math.min(100, Math.max(0, (val / maxVarVal) * 100));

            return (
              <div key={`var-bar-${v.id}`} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{v.name}</span>
                    <span className="text-slate-600 text-[11px] font-sans">({v.type})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {col && col.reducedCost !== 0 && (
                      <span className="text-slate-600 text-[11px]">
                        RC: {formatNumber(col.reducedCost)}
                      </span>
                    )}
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {formatNumber(val)}
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Constraints Utilization Chart */}
      <div className="swiss-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              {t('results.constraintsSummary')}
            </h4>
          </div>
          <span className="text-[11px] text-slate-600 font-sans">
            {solution.rows.filter((r) => r.isBinding).length} activas / {solution.rows.length} total
          </span>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          {solution.rows.map((row) => {
            const isBinding = row.isBinding;
            const barColor = isBinding ? 'bg-amber-500' : 'bg-emerald-600';

            return (
              <div key={`constraint-row-${row.id}`} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{row.name}</span>
                    {isBinding ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        {t('results.binding')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('results.nonBinding')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-slate-600">
                      {formatNumber(row.lhsValue)} {row.operator} {formatNumber(row.rhs)}
                    </span>
                    <span className="font-bold text-slate-700">
                      {row.utilizationPercent}%
                    </span>
                  </div>
                </div>

                {/* Utilization Progress */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                  <div
                    className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, row.utilizationPercent))}%` }}
                  />
                </div>

                {/* Slack and Dual Price */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-0.5">
                  <span>
                    {t('results.slackSurplus')}: {formatNumber(row.slack)}
                  </span>
                  <span>
                    {t('results.dualPrice')}: {formatNumber(row.dualPrice)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
