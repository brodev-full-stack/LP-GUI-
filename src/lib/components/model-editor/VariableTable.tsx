import React from 'react';
import { LPModel, Variable, VariableType } from '../../solver/types';
import { createVariable } from '../../model';
import { useI18n } from '../../i18n';
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';

interface VariableTableProps {
  model: LPModel;
  onChange: (updatedModel: LPModel) => void;
}

export const VariableTable: React.FC<VariableTableProps> = ({ model, onChange }) => {
  const { t } = useI18n();

  const handleAddVariable = () => {
    const nextIdx = model.variables.length + 1;
    const newVar = createVariable(`x${nextIdx}`, 'continuous', 0, null);

    onChange({
      ...model,
      variables: [...model.variables, newVar],
      objective: {
        ...model.objective,
        terms: {
          ...model.objective.terms,
          [newVar.id]: 0,
        },
      },
    });
  };

  const handleRemoveVariable = (varId: string) => {
    if (model.variables.length <= 1) return; // Keep at least one variable

    const updatedVariables = model.variables.filter((v) => v.id !== varId);
    const updatedObjTerms = { ...model.objective.terms };
    delete updatedObjTerms[varId];

    const updatedConstraints = model.constraints.map((c) => {
      const terms = { ...c.terms };
      delete terms[varId];
      return { ...c, terms };
    });

    onChange({
      ...model,
      variables: updatedVariables,
      objective: {
        ...model.objective,
        terms: updatedObjTerms,
      },
      constraints: updatedConstraints,
    });
  };

  const handleUpdateVar = (varId: string, patch: Partial<Variable>) => {
    const updatedVariables = model.variables.map((v) => {
      if (v.id === varId) {
        const updated = { ...v, ...patch };
        if (patch.type === 'binary') {
          updated.lowerBound = 0;
          updated.upperBound = 1;
        }
        return updated;
      }
      return v;
    });

    onChange({
      ...model,
      variables: updatedVariables,
    });
  };

  return (
    <div id="variables-table-card" className="swiss-card p-4 md:p-5 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            {t('editor.variables')}
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
            {model.variables.length}
          </span>
        </div>

        <button
          type="button"
          id="add-variable-button"
          onClick={handleAddVariable}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('editor.addVariable')}</span>
        </button>
      </div>

      {/* Variables Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" className="py-2.5 px-3 w-10 text-center">#</th>
              <th scope="col" className="py-2.5 px-3">{t('editor.varName')}</th>
              <th scope="col" className="py-2.5 px-3">{t('editor.varType')}</th>
              <th scope="col" className="py-2.5 px-3">{t('editor.varLower')}</th>
              <th scope="col" className="py-2.5 px-3">{t('editor.varUpper')}</th>
              <th scope="col" className="py-2.5 px-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {model.variables.map((v, idx) => (
              <tr key={`var-row-${v.id}`} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>

                {/* Variable Name */}
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => handleUpdateVar(v.id, { name: e.target.value })}
                    className="font-mono font-bold text-xs text-blue-700 px-2 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden w-24"
                  />
                </td>

                {/* Variable Type */}
                <td className="py-2 px-3">
                  <select
                    value={v.type}
                    onChange={(e) => handleUpdateVar(v.id, { type: e.target.value as VariableType })}
                    className="text-xs text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden cursor-pointer"
                  >
                    <option value="continuous">{t('editor.typeContinuous')}</option>
                    <option value="integer">{t('editor.typeInteger')}</option>
                    <option value="binary">{t('editor.typeBinary')}</option>
                  </select>
                </td>

                {/* Lower Bound */}
                <td className="py-2 px-3">
                  <input
                    type="number"
                    step="any"
                    value={v.lowerBound !== null ? v.lowerBound : ''}
                    placeholder="-∞"
                    disabled={v.type === 'binary'}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleUpdateVar(v.id, { lowerBound: val !== null && isNaN(val) ? null : val });
                    }}
                    className="font-mono text-xs text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden w-20 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </td>

                {/* Upper Bound */}
                <td className="py-2 px-3">
                  <input
                    type="number"
                    step="any"
                    value={v.upperBound !== null ? v.upperBound : ''}
                    placeholder="+∞"
                    disabled={v.type === 'binary'}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleUpdateVar(v.id, { upperBound: val !== null && isNaN(val) ? null : val });
                    }}
                    className="font-mono text-xs text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 focus:border-blue-500 outline-hidden w-20 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </td>

                {/* Delete Variable */}
                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(v.id)}
                    disabled={model.variables.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition disabled:opacity-20 cursor-pointer"
                    title="Eliminar variable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
