import { LPModel, SolveResult } from '../solver/types';
import { generateUniqueId } from '../model';

export interface LPStudioJSONExport {
  version: 1;
  exportedAt: string;
  model: LPModel;
  solution?: SolveResult | null;
}

export function exportModelToJSON(model: LPModel, solution?: SolveResult | null): string {
  const payload: LPStudioJSONExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    model,
    solution: solution || null,
  };
  return JSON.stringify(payload, null, 2);
}

export function importModelFromJSON(jsonString: string): LPModel {
  const parsed = JSON.parse(jsonString);
  const rawModel = parsed.model || parsed;

  if (!rawModel.variables || !rawModel.constraints || !rawModel.objective) {
    throw new Error('El JSON no contiene una estructura válida de modelo LP.');
  }

  return {
    id: generateUniqueId('model'),
    name: rawModel.name || 'Modelo Importado',
    description: rawModel.description || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction: rawModel.objective.direction === 'minimize' ? 'minimize' : 'maximize',
      terms: rawModel.objective.terms || {},
    },
    variables: rawModel.variables.map((v: any, index: number) => ({
      id: v.id || generateUniqueId('v'),
      name: v.name || `x${index + 1}`,
      type: v.type === 'integer' || v.type === 'binary' ? v.type : 'continuous',
      lowerBound: v.lowerBound !== undefined ? v.lowerBound : 0,
      upperBound: v.upperBound !== undefined ? v.upperBound : null,
    })),
    constraints: rawModel.constraints.map((c: any, index: number) => ({
      id: c.id || generateUniqueId('c'),
      name: c.name || `c${index + 1}`,
      operator: c.operator === '>=' || c.operator === '=' ? c.operator : '<=',
      rhs: Number(c.rhs) || 0,
      terms: c.terms || {},
    })),
  };
}
