import React from 'react';
import { SolveResult } from '../solver/types';
import { useI18n } from '../i18n';
import { Sliders, HelpCircle } from 'lucide-react';

interface SensitivityProps {
  solution?: SolveResult | null;
}

export const SensitivityPanel: React.FC<SensitivityProps> = ({ solution }) => {
  const { t, formatNumber } = useI18n();

  if (!solution || solution.status !== 'Optimal' || !solution.sensitivity) {
    return null;
  }

  const { variables, constraints } = solution.sensitivity;

  return (
    <div id="sensitivity-analysis-panel" className="liquid-card rounded-2xl p-5 border border-white/80 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900 tracking-tight text-base">
            {t('sensitivity.title')}
          </h3>
        </div>
      </div>

      {/* Constraints Dual Prices Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            {t('sensitivity.rhsRanges')} ({t('results.dualPrice')})
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-medium border-b border-slate-200/60">
                <th scope="col" className="py-2.5 px-3">Restricción</th>
                <th scope="col" className="py-2.5 px-3 font-mono">RHS Actual</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.dualPrice')}</th>
                <th scope="col" className="py-2.5 px-3">Impacto Marginal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 font-mono">
              {constraints.map((c) => {
                const isDualActive = Math.abs(c.dualPrice) > 1e-4;
                return (
                  <tr key={`sens-c-${c.id}`} className="hover:bg-slate-50/50 transition">
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{c.name}</td>
                    <td className="py-2 px-3 text-slate-700">{formatNumber(c.currentRhs)}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={isDualActive ? 'text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100' : 'text-slate-500'}>
                        {formatNumber(c.dualPrice)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                      {isDualActive
                        ? `+1 en RHS cambia Z en ${formatNumber(c.dualPrice)}`
                        : 'Recurso abundante (sin impacto marginal)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variables Reduced Costs Table */}
      <div className="flex flex-col gap-2 pt-2">
        <span className="text-xs font-semibold text-slate-700">
          {t('sensitivity.coefficients')} ({t('results.reducedCost')})
        </span>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-medium border-b border-slate-200/60">
                <th scope="col" className="py-2.5 px-3">Variable</th>
                <th scope="col" className="py-2.5 px-3 font-mono">Coef. Actual (c)</th>
                <th scope="col" className="py-2.5 px-3 font-mono">{t('results.reducedCost')}</th>
                <th scope="col" className="py-2.5 px-3">Estado en Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 font-mono">
              {variables.map((v) => {
                const isNonZeroRC = Math.abs(v.reducedCost) > 1e-4;
                return (
                  <tr key={`sens-v-${v.varId}`} className="hover:bg-slate-50/50 transition">
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{v.name}</td>
                    <td className="py-2 px-3 text-slate-700">{formatNumber(v.currentCoeff)}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={isNonZeroRC ? 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100' : 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100'}>
                        {formatNumber(v.reducedCost)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                      {isNonZeroRC
                        ? `Fuera de base (se debe mejorar coeff en ${formatNumber(Math.abs(v.reducedCost))} para entrar)`
                        : 'Variable básica activa en solución'}
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
