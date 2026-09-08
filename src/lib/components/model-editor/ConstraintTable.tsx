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
    <div id="constraints-table-card" className="m3-card p-5 flex flex-col gap-4 bg-white border border-slate-200/90 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <SplitSquareVertical className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {t('editor.constraints')}
            </h3>
            <p className="text-xs text-slate-500">
              Desigualdades lineales, consumo de recursos y requerimientos
            </p>
          </div>
          <span className="m3-badge-tonal px-2.5 py-0.5 text-xs font-mono">
            {model.constraints.length}
          </span>
        </div>

        <button
          type="button"
          id="add-constraint-button"
          onClick={handleAddConstraint}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('editor.addConstraint')}</span>
        </button>
      </div>

      {/* Constraints List or Empty State */}
      {model.constraints.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-center flex flex-col items-center gap-2">
          <p className="text-xs text-slate-500 max-w-sm">
            No hay restricciones en este modelo. Comienza desde cero agregando tus límites de recursos o requerimientos.
          </p>
          <button
            type="button"
            onClick={handleAddConstraint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer mt-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Restricción (c1)</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {model.constraints.map((c, idx) => (
            <div
              key={`constraint-item-${c.id}`}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 flex flex-col gap-2.5 hover:border-indigo-300 transition shadow-2xs"
            >
              {/* Top row: Name, Operator, RHS, Delete */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400 w-5">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => handleUpdateConstraint(c.id, { name: e.target.value })}
                    placeholder="c1"
                    className="font-medium text-xs text-slate-900 px-2.5 py-1 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 outline-hidden w-36 sm:w-44 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Operator Selector */}
                  <select
                    value={c.operator}
                    onChange={(e) => handleUpdateConstraint(c.id, { operator: e.target.value as ConstraintOperator })}
                    className="font-mono font-bold text-xs text-slate-900 px-3 py-1 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 outline-hidden cursor-pointer shadow-2xs"
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
                      className="font-mono font-bold text-xs text-slate-900 px-2 py-1 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 outline-hidden w-20 text-right shadow-2xs"
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(c.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer ml-1"
                    title="Eliminar restricción"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Variable terms row */}
              <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-mono font-medium shrink-0">LHS:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {model.variables.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">Sin variables</span>
                  )}
                  {model.variables.map((v) => {
                    const coeff = c.terms[v.id] ?? 0;
                    return (
                      <div
                        key={`c-${c.id}-v-${v.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 focus-within:border-indigo-500"
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
                        <span className="font-mono text-[11px] font-bold text-indigo-700 pr-0.5">
                          {v.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live mathematical formula preview */}
              <div className="text-[11px] font-mono font-medium text-indigo-950 bg-indigo-50/60 px-3 py-1.5 rounded-xl border border-indigo-100/80 truncate">
                {getConstraintPreview(c)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
