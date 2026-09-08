import React from 'react';
import { LPModel, SolveResult, VariableResult } from '../solver/types';
import { useI18n } from '../i18n';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { BarChart3, Layers, CheckCircle2, AlertCircle, PieChart, Sparkles } from 'lucide-react';

interface MultivarVizProps {
  model: LPModel;
  solution?: SolveResult | null;
}

export const MultivarViz: React.FC<MultivarVizProps> = ({ model, solution }) => {
  const { t, formatNumber } = useI18n();

  if (!solution || solution.status !== 'Optimal') return null;

  // Prepare Decision Variables Data for Recharts
  const variablesData = model.variables.map((v) => {
    const col = solution.columns[v.id];
    const val = col ? col.value : 0;
    const reducedCost = col ? col.reducedCost : 0;
    const coeff = model.objective.terms[v.id] ?? 0;
    return {
      name: v.name,
      fullName: `${v.name} (${v.type})`,
      valor: Math.round(val * 1000) / 1000,
      costoReducido: Math.round(reducedCost * 1000) / 1000,
      coeficiente: coeff,
      tipo: v.type,
    };
  });

  // Prepare Constraints Resource Utilization Data
  const constraintsData = solution.rows.map((r) => {
    const used = Math.max(0, r.lhsValue);
    const slack = Math.max(0, r.slack);
    return {
      name: r.name,
      utilizado: Math.round(used * 100) / 100,
      holgura: Math.round(slack * 100) / 100,
      capacidad: Math.round(r.rhs * 100) / 100,
      porcentaje: r.utilizationPercent,
      isBinding: r.isBinding,
      precioDual: r.dualPrice,
    };
  });

  // Radar data for constraint saturation
  const radarData = solution.rows.map((r) => ({
    constraint: r.name,
    saturacion: Math.min(100, Math.max(0, r.utilizationPercent)),
    fullMark: 100,
  }));

  return (
    <div id="multivar-viz-container" className="flex flex-col gap-5 text-slate-800">
      {/* Notice card if > 2 variables */}
      {model.variables.length > 2 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-indigo-950 block">
              Modelo Multidimensional ({model.variables.length} Variables de Decisión)
            </span>
            <p className="text-indigo-800/80 mt-0.5 leading-relaxed">
              {t('viz.noticeMultivar')} Mostrando analítica visual con gráficos interactivos de barras, utilización y radar de holguras.
            </p>
          </div>
        </div>
      )}

      {/* Decision Variables Optimal Allocation Bar Chart */}
      <div className="m3-card p-5 flex flex-col gap-4 bg-white border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Valores Óptimos de Variables (x*)
              </h4>
              <p className="text-xs text-slate-500">
                Nivel óptimo asignado a cada actividad en la solución
              </p>
            </div>
          </div>
          <span className="m3-badge-tonal px-3 py-1 text-xs">
            Z* = {formatNumber(solution.objectiveValue)}
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={variablesData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="varOptimalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                }}
                formatter={(value: unknown) => [typeof value === 'number' ? formatNumber(value) : String(value ?? ''), 'Valor Óptimo']}
                labelFormatter={(label) => `Variable: ${label}`}
              />
              <Bar
                dataKey="valor"
                fill="url(#varOptimalGrad)"
                radius={[8, 8, 2, 2]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Constraints Utilization & Slack Chart */}
      <div className="m3-card p-5 flex flex-col gap-4 bg-white border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Utilización de Recursos vs. Holguras
              </h4>
              <p className="text-xs text-slate-500">
                Consumo real de restricciones y recursos limitantes (Binding)
              </p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={constraintsData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="usedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.75} />
                </linearGradient>
                <linearGradient id="slackGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="utilizado" name="Consumido (LHS)" fill="url(#usedGrad)" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={44} />
              <Bar dataKey="holgura" name="Holgura Sobrante" fill="url(#slackGrad)" stackId="a" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar Chart if 3 or more constraints */}
      {constraintsData.length >= 3 && (
        <div className="m3-card p-5 flex flex-col gap-4 bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Radar de Saturación de Restricciones (%)
              </h4>
              <p className="text-xs text-slate-500">
                Visualiza qué restricciones alcanzaron el 100% de saturación (cuello de botella)
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="constraint" stroke="#475569" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" fontSize={10} />
                <Radar
                  name="Saturación %"
                  dataKey="saturacion"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown) => [`${val}%`, 'Saturación']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
