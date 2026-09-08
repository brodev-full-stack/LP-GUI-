import React from 'react';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { useI18n } from '../../i18n';
import { LPModel, SolveResult } from '../../solver/types';
import { Cpu, Check, Activity } from 'lucide-react';

interface StatusBarProps {
  model: LPModel;
  solution?: SolveResult | null;
  isSolving?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ model, solution, isSolving }) => {
  const { t } = useI18n();

  return (
    <footer className="w-full bg-white border-t border-slate-200 px-4 py-2 text-xs text-slate-600 flex items-center justify-between gap-3 flex-wrap select-none">
      {/* Left: Online/offline + Ready status */}
      <div className="flex items-center gap-3">
        <OfflineIndicator />
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          {isSolving ? t('editor.solving') : t('status.ready')}
        </span>
      </div>

      {/* Center: Dimensions */}
      <div className="font-mono text-[11px] text-slate-500">
        {t('status.dimensions', {
          vars: model.variables.length,
          constraints: model.constraints.length,
        })}
      </div>

      {/* Right: Engine info */}
      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1 text-slate-600">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          {solution ? solution.solverBackend : 'HiGHS (WASM)'}
        </span>
        {solution && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-medium">
              {solution.status} ({(solution.solveTimeMs ?? 0).toFixed(1)} ms)
            </span>
          </>
        )}
      </div>
    </footer>
  );
};
