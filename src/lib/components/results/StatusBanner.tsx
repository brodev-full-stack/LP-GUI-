import React from 'react';
import { SolveResult } from '../../solver/types';
import { useI18n } from '../../i18n';
import { CheckCircle2, AlertOctagon, HelpCircle, AlertTriangle, Cpu, Clock } from 'lucide-react';

interface StatusBannerProps {
  result?: SolveResult | null;
  solution?: SolveResult | null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ result, solution }) => {
  const actualResult = solution ?? result;
  const { t, formatNumber } = useI18n();

  if (!actualResult) return null;

  const getStatusConfig = () => {
    switch (actualResult.status) {
      case 'Optimal':
        return {
          title: t('results.statusOptimal'),
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'Infeasible':
        return {
          title: t('results.statusInfeasible'),
          bg: 'bg-red-50 border-red-200 text-red-900',
          icon: <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />,
          badgeBg: 'bg-red-100 text-red-800 border-red-300',
        };
      case 'Unbounded':
        return {
          title: t('results.statusUnbounded'),
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      default:
        return {
          title: t('results.statusError'),
          bg: 'bg-slate-100 border-slate-300 text-slate-900',
          icon: <HelpCircle className="w-5 h-5 text-slate-600 shrink-0" />,
          badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      id="solve-status-banner"
      className={`rounded-xl p-4 border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${config.bg}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight">{config.title}</span>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-mono mt-0.5">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              {actualResult.solverBackend}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {(actualResult.solveTimeMs ?? 0).toFixed(1)} ms
            </span>
          </div>
        </div>
      </div>

      {actualResult.status === 'Optimal' && (
        <div className="flex items-baseline gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200">
          <span className="text-xs text-slate-600 font-sans font-medium">
            {t('results.objectiveValue')}:
          </span>
          <span className="text-lg font-bold font-mono text-emerald-700">
            {formatNumber(actualResult.objectiveValue)}
          </span>
        </div>
      )}
    </div>
  );
};
