import React from 'react';
import { SolveResult } from '../../solver/types';
import { useI18n } from '../../i18n';
import { CheckCircle2, AlertOctagon, HelpCircle, AlertTriangle, Cpu, Clock } from 'lucide-react';

interface StatusBannerProps {
  result: SolveResult;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ result }) => {
  const { t, formatNumber } = useI18n();

  const getStatusConfig = () => {
    switch (result.status) {
      case 'Optimal':
        return {
          title: t('results.statusOptimal'),
          bg: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'Infeasible':
        return {
          title: t('results.statusInfeasible'),
          bg: 'bg-red-50/90 border-red-200 text-red-900',
          icon: <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />,
          badgeBg: 'bg-red-100 text-red-800 border-red-300',
        };
      case 'Unbounded':
        return {
          title: t('results.statusUnbounded'),
          bg: 'bg-amber-50/90 border-amber-200 text-amber-900',
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
      className={`rounded-2xl p-4 border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${config.bg}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight">{config.title}</span>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-mono mt-0.5">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              {result.solverBackend}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {result.solveTimeMs.toFixed(1)} ms
            </span>
          </div>
        </div>
      </div>

      {result.status === 'Optimal' && (
        <div className="flex items-baseline gap-2 bg-white/80 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-xs text-slate-600 font-sans font-medium">
            {t('results.objectiveValue')}:
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700">
            {formatNumber(result.objectiveValue)}
          </span>
        </div>
      )}
    </div>
  );
};
