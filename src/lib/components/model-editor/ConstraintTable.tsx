import React from 'react';
import { LPModel, Constraint, ConstraintOperator } from '../../solver/types';
import { createConstraint } from '../../model';
import { useI18n } from '../../i18n';
import { Plus, Trash2, SplitSquareVertical } from 'lucide-react';

interface ConstraintTableProps {
  model: LPModel;
  onChange: (updatedModel: LPModel) => void;
}

export const ConstraintTable: React.FC<ConstraintTableProps> = ({ model, onChange }) => {
  const { t, formatNumber } = useI18n();

  const handleAddConstraint = () => {
    const nextIdx = model.constraints.length + 1;
    const initialTerms: Record<string, number> = {};
    model.variables.forEach((v, i) => {
      initialTerms[v.id] = i === 0 ? 1 : 0;
    });

    const newConstraint = createConstraint(`c${nextIdx}`, '<=', 10, initialTerms);

    onChange({
      ...model,
      constraints: [...model.constraints, newConstraint],
    });
  };

  const handleRemoveConstraint = (constraintId: string) => {
    if (model.constraints.length <= 1) return;

    onChange({
      ...model,
      constraints: model.constraints.filter((c) => c.id !== constraintId),
    });
  };

  const handleUpdateConstraint = (constraintId: string, patch: Partial<Constraint>) => {
    onChange({
      ...model,
      constraints: model.constraints.map((c) => {
        if (c.id === constraintId) {
          return { ...c, ...patch };
        }
        return c;
      }),
    });
  };

  const handleSetTerm = (constraintId: string, varId: string, value: number) => {
    onChange({
      ...model,
      constraints: model.constraints.map((c) => {
        if (c.id === constraintId) {
          return {
            ...c,
            terms: {
              ...c.terms,
              [varId]: value,
            },
          };
        }
        return c;
      }),
    });
  };

  const getConstraintPreview = (c: Constraint): string => {
    const termParts = model.variables
      .map((v) => {
        const coeff = c.terms[v.id] ?? 0;
        if (coeff === 0) return null;
        const sign = coeff >= 0 ? '+' : '-';
        const absVal = Math.abs(coeff);
        const coeffStr = absVal === 1 ? '' : `${formatNumber(absVal)} `;
        return { sign, text: `${coeffStr}${v.name}` };
      })
      .filter(Boolean);

    let lhs = '0';
    if (termParts.length > 0) {
      lhs = termParts
        .map((p, i) => (i === 0 ? (p!.sign === '-' ? `-${p!.text}` : p!.text) : `${p!.sign} ${p!.text}`))
        .join(' ');
    }

    const opSymbol = c.operator === '<=' ? '≤' : c.operator === '>=' ? '≥' : '=';
    return `${lhs} ${opSymbol} ${formatNumber(c.rhs)}`;
  };

  return (
    <div id="constraints-table-card" className="swiss-card p-4 md:p-5 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <SplitSquareVertical className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            {t('editor.constraints')}
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
            {model.constraints.length}
          </span>
        </div>

        <button
          type="button"
          id="add-constraint-button"
          onClick={handleAddConstraint}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('editor.addConstraint')}</span>
        </button>
      </div>

      {/* Constraints List */}
      <div className="flex flex-col gap-3">
        {model.constraints.map((c, idx) => (
          <div
            key={`constraint-item-${c.id}`}
            className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col gap-2.5 hover:border-slate-300 transition"
          >
            {/* Top row: Name, Operator, RHS, Delete */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500 w-5">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => handleUpdateConstraint(c.id, { name: e.target.value })}
                  placeholder="c1"
                  className="font-medium text-xs text-slate-900 px-2 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden w-36 sm:w-44"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Operator Selector */}
                <select
                  value={c.operator}
                  onChange={(e) => handleUpdateConstraint(c.id, { operator: e.target.value as ConstraintOperator })}
                  className="font-mono font-bold text-xs text-slate-900 px-2.5 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden cursor-pointer"
                >
                  <option value="<=">≤</option>
                  <option value="=">=</option>
                  <option value=">=">≥</option>
                </select>

                {/* RHS input */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-semibold font-mono">RHS:</span>
                  <input
                    type="number"
                    step="any"
                    value={c.rhs}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdateConstraint(c.id, { rhs: isNaN(val) ? 0 : val });
                    }}
                    className="font-mono font-bold text-xs text-slate-900 px-2 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden w-20 text-right"
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveConstraint(c.id)}
                  disabled={model.constraints.length <= 1}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition disabled:opacity-20 cursor-pointer ml-1"
                  title="Eliminar restricción"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Variable terms row */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-mono font-medium shrink-0">LHS:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {model.variables.map((v) => {
                  const coeff = c.terms[v.id] ?? 0;
                  return (
                    <div
                      key={`c-${c.id}-v-${v.id}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 focus-within:border-blue-500"
                    >
                      <input
                        type="number"
                        step="any"
                        value={coeff === 0 ? '' : coeff}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleSetTerm(c.id, v.id, isNaN(val) ? 0 : val);
                        }}
                        className="w-12 text-right font-mono font-semibold text-xs text-slate-900 bg-transparent outline-hidden"
                      />
                      <span className="font-mono text-[11px] font-bold text-slate-700 pr-1">
                        {v.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live mathematical formula preview */}
            <div className="text-[11px] font-mono font-medium text-blue-900 bg-blue-50/70 px-2.5 py-1 rounded border border-blue-100 truncate">
              {getConstraintPreview(c)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
