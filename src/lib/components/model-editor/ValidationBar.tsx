import React from 'react';
import { LPModel } from '../../solver/types';
import { validateModel } from '../../model';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface ValidationBarProps {
  model: LPModel;
}

export const ValidationBar: React.FC<ValidationBarProps> = ({ model }) => {
  const validation = validateModel(model);

  if (validation.isValid && validation.warnings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Errors */}
      {validation.errors.map((err, idx) => (
        <div
          key={`val-err-${idx}`}
          className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{err.fallbackMessage}</span>
        </div>
      ))}

      {/* Warnings */}
      {validation.warnings.map((warn, idx) => (
        <div
          key={`val-warn-${idx}`}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
        >
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{warn.fallbackMessage}</span>
        </div>
      ))}
    </div>
  );
};
