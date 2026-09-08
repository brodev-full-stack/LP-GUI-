import { LPModel, Variable, Constraint, VariableType, ConstraintOperator } from '../solver/types';
import { validateModel, ModelValidationResult } from './schema';
import { modelToLPFormat } from './transforms';
import { EXAMPLE_MODELS } from './examples';

let idCounter = 1;
export function generateUniqueId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

export function createVariable(
  name?: string,
  type: VariableType = 'continuous',
  lowerBound: number | null = 0,
  upperBound: number | null = null
): Variable {
  const id = generateUniqueId('v');
  return {
    id,
    name: name || `x${idCounter}`,
    type,
    lowerBound,
    upperBound,
  };
}

export function createConstraint(
  name?: string,
  operator: ConstraintOperator = '<=',
  rhs: number = 0,
  terms: Record<string, number> = {}
): Constraint {
  const id = generateUniqueId('c');
  return {
    id,
    name: name || `c${idCounter}`,
    terms: { ...terms },
    operator,
    rhs,
  };
}

export function createModel(name: string = 'Nuevo Modelo'): LPModel {
  const v1 = createVariable('x1', 'continuous', 0, null);
  const v2 = createVariable('x2', 'continuous', 0, null);

  const c1 = createConstraint('Restricción 1', '<=', 10, {
    [v1.id]: 1,
    [v2.id]: 1,
  });

  return {
    id: generateUniqueId('model'),
    name,
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction: 'maximize',
      terms: {
        [v1.id]: 1,
        [v2.id]: 1,
      },
    },
    variables: [v1, v2],
    constraints: [c1],
  };
}

export function cloneModel(model: LPModel): LPModel {
  return JSON.parse(JSON.stringify(model));
}

export { createModel as createEmptyModel };
export { validateModel, modelToLPFormat, EXAMPLE_MODELS, EXAMPLE_MODELS as PRELOADED_EXAMPLES };
export type { ModelValidationResult };
