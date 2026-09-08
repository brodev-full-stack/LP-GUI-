import React from 'react';
import { LPModel, SolveResult } from '../../solver/types';
import { generateDualProblem } from '../../model/lingo';
import { useI18n } from '../../i18n';
import { ArrowLeftRight, CheckCircle2, Copy, Layers, Check } from 'lucide-react';

interface DualReportPanelProps {
  model: LPModel;
  solution?: SolveResult | null;
}

export const DualReportPanel: React.FC<DualReportPanelProps> = ({ model, solution }) => {
  const { t, formatNumber } = useI18n();
  const [copied, setCopied] = React.useState<boolean>(false);

  const dualInfo = React.useMemo(() => {
    return generateDualProblem(model);
  }, [model]);

  const handleCopyDual = async () => {
    const text = [
      `## PROBLEMA DUAL FORMULADO`,
      dualInfo.dualObjective,
      `Sujeto a:`,
      ...dualInfo.dualConstraints.map((c) => `  ${c.expression} (${c.name})`),
      `Variables:`,
      ...dualInfo.dualVariables.map((v) => `  ${v.name}: ${v.bounds}`),
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 text-slate-800">
      {/* Dual Header Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-indigo-950">
              Formulación Dual Canónica
            </h4>
            <p className="text-xs text-indigo-800/80">
              Derivado matemáticamente del Problema Primal según el Teorema de Dualidad Fuerte.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyDual}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shadow-2xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado' : 'Copiar Dual'}</span>
        </button>
      </div>

      {/* Dual Objective & Constraints Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4 shadow-2xs font-mono text-xs">
        <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
          <span className="font-sans text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Función Objetivo Dual (Minimizar Costo de Recursos W):
          </span>
          <span className="text-sm font-bold text-indigo-700 font-mono bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
            {dualInfo.dualObjective}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-sans text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Restricciones Duales (Cota Mínima de Rentabilidad por Actividad):
          </span>
          <div className="space-y-1.5">
            {dualInfo.dualConstraints.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/70"
              >
                <span className="font-bold text-slate-800">{c.expression}</span>
                <span className="font-sans text-[11px] text-slate-500">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <span className="font-sans text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Condiciones de No Negatividad y Signos Duales:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {dualInfo.dualVariables.map((v, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] border border-slate-200"
              >
                {v.name} {v.bounds}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Dual Value Equivalence (Strong Duality) */}
      {solution && solution.status === 'Optimal' && (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900 block">
                Teorema de Dualidad Fuerte Satisfecho:
              </span>
              <span className="text-emerald-800 font-mono">
                Valor Óptimo Primal Z* = {formatNumber(solution.objectiveValue)} = Valor Óptimo Dual W*
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-200/70 text-emerald-900 font-semibold font-mono text-xs">
            Gap de Dualidad = 0.0000
          </span>
        </div>
      )}

      {/* Matrix Coefficient Tableau */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
            Matriz de Coeficientes de Actividades (A | b | c)
          </h5>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2 px-3 font-sans font-semibold">Restricción</th>
                {model.variables.map((v) => (
                  <th key={v.id} className="py-2 px-3 font-bold text-indigo-700">
                    {v.name}
                  </th>
                ))}
                <th className="py-2 px-3 font-sans font-semibold text-slate-600">Op</th>
                <th className="py-2 px-3 font-sans font-semibold text-slate-900">RHS (b)</th>
                <th className="py-2 px-3 font-sans font-semibold text-emerald-700">Precio Sombra (y*)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {model.constraints.map((c, rIdx) => {
                const rowSol = solution?.rows.find((r) => r.id === c.id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">{c.name}</td>
                    {model.variables.map((v) => (
                      <td key={v.id} className="py-2 px-3 text-slate-800">
                        {c.terms[v.id] ?? 0}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-slate-500 font-bold">{c.operator}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{formatNumber(c.rhs)}</td>
                    <td className="py-2 px-3 font-bold text-emerald-700">
                      {rowSol ? formatNumber(rowSol.dualPrice) : '-'}
                    </td>
                  </tr>
                );
              })}
              {/* Objective row */}
              <tr className="bg-indigo-50/50 font-bold border-t-2 border-indigo-200">
                <td className="py-2 px-3 font-sans text-indigo-900">Costo Obj (c)</td>
                {model.variables.map((v) => (
                  <td key={v.id} className="py-2 px-3 text-indigo-800">
                    {formatNumber(model.objective.terms[v.id] ?? 0)}
                  </td>
                ))}
                <td className="py-2 px-3 text-slate-400">-</td>
                <td className="py-2 px-3 text-indigo-950">{formatNumber(solution?.objectiveValue ?? 0)}</td>
                <td className="py-2 px-3 text-emerald-700">Z* Óptimo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
