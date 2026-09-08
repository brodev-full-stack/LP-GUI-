import React from 'react';
import { SolveResult } from '../solver/types';
import { useI18n } from '../i18n';
import { Sliders, CheckCircle2, ArrowRight } from 'lucide-react';

interface SensitivityProps {
  solution?: SolveResult | null;
}

export const SensitivityPanel: React.FC<SensitivityProps> = ({ solution }) => {
  const { t, formatNumber } = useI18n();

  if (!solution || solution.status !== 'Optimal' || !solution.sensitivity) {
    return null;
  }

  const { variables, constraints } = solution.sensitivity;

  const formatBound = (val: number | null, isMin: boolean) => {
    if (val === null) return isMin ? '-∞' : '+∞';
    return formatNumber(val);
  };

  return (
    <div id="sensitivity-analysis-panel" className="flex flex-col gap-5">
      {/* Constraints RHS Ranging Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900">
            {t('sensitivity.rhsRanges')} ({t('results.tableDualPrice')})
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th scope="col" className="py-2.5 px-3">{t('results.tableConstraint')}</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableRhs')}</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableDualPrice')}</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableAllowableRange')}</th>
                <th scope="col" className="py-2.5 px-3">{t('results.tableImpact')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {constraints.map((c) => {
                const isDualActive = Math.abs(c.dualPrice) > 1e-4;
                const minStr = formatBound(c.minRhs, true);
                const maxStr = formatBound(c.maxRhs, false);

                return (
                  <tr key={`sens-c-${c.id}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">{c.name}</td>
                    <td className="py-2 px-3 text-slate-800">{formatNumber(c.currentRhs)}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={isDualActive ? 'text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200' : 'text-slate-500'}>
                        {formatNumber(c.dualPrice)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800 text-[11px]">
                      [{minStr}, {maxStr}]
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                      {isDualActive
                        ? t('results.marginalChange', { val: formatNumber(c.dualPrice) })
                        : t('results.abundantResource')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variables Objective Coefficients Ranging Table */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-900">
          {t('sensitivity.coefficients')} ({t('results.tableReducedCost')})
        </span>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th scope="col" className="py-2.5 px-3">{t('results.tableVar')}</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('sensitivity.current')} (c)</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableReducedCost')}</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.tableAllowableRange')}</th>
                <th scope="col" className="py-2.5 px-3">{t('results.tableBasisStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {variables.map((v) => {
                const isNonZeroRC = Math.abs(v.reducedCost) > 1e-4;
                const minStr = formatBound(v.minCoeff, true);
                const maxStr = formatBound(v.maxCoeff, false);

                return (
                  <tr key={`sens-v-${v.varId}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">{v.name}</td>
                    <td className="py-2 px-3 text-slate-800">{formatNumber(v.currentCoeff)}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={isNonZeroRC ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200' : 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200'}>
                        {formatNumber(v.reducedCost)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800 text-[11px]">
                      [{minStr}, {maxStr}]
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                      {isNonZeroRC ? t('results.outOfBasis') : t('results.inBasis')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
