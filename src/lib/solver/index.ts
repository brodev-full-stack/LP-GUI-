import { LPModel, SolveResult } from './types';
import { solveModelWithHighs } from './highs-adapter';

/**
 * Public Solver API
 * Accepts any valid LPModel and delegates to encapsulated solver adapter.
 */
export async function solve(model: LPModel): Promise<SolveResult> {
  return solveModelWithHighs(model);
}

export { solve as solveLP };

export * from './types';
export * from './errors';
