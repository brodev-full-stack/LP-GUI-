/**
 * Types for LP Studio Solver Architecture
 * Encapsulated public types for models, variables, constraints, and solutions.
 */

export type VariableType = 'continuous' | 'integer' | 'binary';
export type ConstraintOperator = '<=' | '=' | '>=';
export type ObjectiveDirection = 'maximize' | 'minimize';

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  lowerBound: number | null; // null means -Infinity (free) or 0 depending on context
  upperBound: number | null; // null means +Infinity
}

export interface Constraint {
  id: string;
  name: string;
  terms: Record<string, number>; // varId -> coefficient
  operator: ConstraintOperator;
  rhs: number;
}

export interface Objective {
  direction: ObjectiveDirection;
  terms: Record<string, number>; // varId -> coefficient
}

export interface LPModel {
  id: string;
  name: string;
  description?: string;
  objective: Objective;
  variables: Variable[];
  constraints: Constraint[];
  createdAt: number;
  updatedAt: number;
}

export type SolverStatus =
  | 'Optimal'
  | 'Infeasible'
  | 'Unbounded'
  | 'NumericalIssue'
  | 'Error'
  | 'Empty';

export interface VariableResult {
  name: string;
  varId: string;
  value: number;
  type: VariableType;
  reducedCost: number;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface ConstraintResult {
  id: string;
  name: string;
  lhsValue: number;
  operator: ConstraintOperator;
  rhs: number;
  slack: number;
  dualPrice: number;
  isBinding: boolean;
  utilizationPercent: number;
}

export interface SensitivityVariable {
  name: string;
  varId: string;
  currentCoeff: number;
  reducedCost: number;
  minCoeff: number | null;
  maxCoeff: number | null;
}

export interface SensitivityConstraint {
  name: string;
  id: string;
  currentRhs: number;
  dualPrice: number;
  minRhs: number | null;
  maxRhs: number | null;
}

export interface SolveResult {
  status: SolverStatus;
  statusMessage: string;
  objectiveValue: number;
  columns: Record<string, VariableResult>;
  rows: ConstraintResult[];
  solveTimeMs: number;
  sensitivity?: {
    variables: SensitivityVariable[];
    constraints: SensitivityConstraint[];
  };
  conflictingConstraints?: string[];
  unboundedDirection?: Record<string, number>;
  solverBackend: 'highs-wasm' | 'simplex-js';
}
