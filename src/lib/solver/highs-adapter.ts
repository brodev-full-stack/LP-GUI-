import highs from 'highs';
import solver from 'javascript-lp-solver';
import { LPModel, SolveResult, VariableResult, ConstraintResult, SensitivityVariable, SensitivityConstraint } from './types';
import { modelToLPFormat } from '../model/transforms';
import { computeSensitivityRanging } from './sensitivity';
import { SolverError, InfeasibleError, UnboundedError, NumericalIssueError } from './errors';

type HighsInstance = {
  solve: (lp: string) => {
    Status: string;
    ObjectiveValue: number;
    Columns?: Record<
      string,
      {
        Index: number;
        Status: string;
        Lower: number | null;
        Upper: number | null;
        Primal: number;
        Dual: number;
        Name: string;
        Type: string;
      }
    >;
    Rows?: Array<{
      Index: number;
      Status: string;
      Lower: number | null;
      Upper: number | null;
      Primal: number;
      Dual: number;
      Name: string;
    }>;
  };
};

let highsPromise: Promise<HighsInstance> | null = null;

/**
 * Initializes and caches the HiGHS WASM solver module.
 */
export async function getHighsInstance(): Promise<HighsInstance> {
  if (!highsPromise) {
    highsPromise = (async () => {
      try {
        // Highs supports locateFile to point directly to the cached public wasm asset
        const initFn = typeof highs === 'function' ? highs : (highs as unknown as { default: () => Promise<HighsInstance> }).default;
        const instance = await initFn({
          locateFile: (file: string) => {
            if (file.endsWith('.wasm')) {
              return '/highs.wasm';
            }
            return file;
          },
        });
        return instance as HighsInstance;
      } catch (err) {
        console.warn('HiGHS WASM load note, fallback solver available:', err);
        throw err;
      }
    })();
  }
  return highsPromise;
}

/**
 * Solves model via pure JavaScript Simplex fallback if WASM is unavailable.
 */
function solveWithSimplexFallback(model: LPModel, startTime: number): SolveResult {
  const isMin = model.objective.direction === 'minimize';
  
  // Format for javascript-lp-solver
  const variablesObj: Record<string, Record<string, number>> = {};
  const intsObj: Record<string, 1> = {};
  const binariesObj: Record<string, 1> = {};

  model.variables.forEach((v) => {
    variablesObj[v.id] = {
      _obj: model.objective.terms[v.id] ?? 0,
    };
    if (v.type === 'integer') intsObj[v.id] = 1;
    if (v.type === 'binary') binariesObj[v.id] = 1;
  });

  const constraintsObj: Record<string, { min?: number; max?: number; equal?: number }> = {};

  model.constraints.forEach((c) => {
    if (c.operator === '<=') {
      constraintsObj[c.id] = { max: c.rhs };
    } else if (c.operator === '>=') {
      constraintsObj[c.id] = { min: c.rhs };
    } else {
      constraintsObj[c.id] = { equal: c.rhs };
    }

    model.variables.forEach((v) => {
      const coeff = c.terms[v.id] ?? 0;
      if (coeff !== 0) {
        variablesObj[v.id][c.id] = coeff;
      }
    });
  });

  // Apply bounds as auxiliary constraints if needed
  model.variables.forEach((v) => {
    if (v.type === 'binary') {
      constraintsObj[`_bnd_max_${v.id}`] = { max: 1 };
      constraintsObj[`_bnd_min_${v.id}`] = { min: 0 };
      variablesObj[v.id][`_bnd_max_${v.id}`] = 1;
      variablesObj[v.id][`_bnd_min_${v.id}`] = 1;
    } else {
      if (v.lowerBound !== null && v.lowerBound !== 0) {
        constraintsObj[`_bnd_min_${v.id}`] = { min: v.lowerBound };
        variablesObj[v.id][`_bnd_min_${v.id}`] = 1;
      }
      if (v.upperBound !== null) {
        constraintsObj[`_bnd_max_${v.id}`] = { max: v.upperBound };
        variablesObj[v.id][`_bnd_max_${v.id}`] = 1;
      }
    }
  });

  const lpPayload: Record<string, unknown> = {
    optimize: '_obj',
    opType: isMin ? 'min' : 'max',
    constraints: constraintsObj,
    variables: variablesObj,
    ints: Object.keys(intsObj).length > 0 ? intsObj : undefined,
    binaries: Object.keys(binariesObj).length > 0 ? binariesObj : undefined,
  };

  const lpResult = (solver as { Solve: (p: unknown) => Record<string, unknown> }).Solve(lpPayload);
  const solveTimeMs = Math.max(0.5, Math.round((performance.now() - startTime) * 10) / 10);

  if (!lpResult || !lpResult.feasible) {
    return {
      status: 'Infeasible',
      statusMessage: 'El modelo no tiene ninguna solución factible.',
      objectiveValue: 0,
      columns: {},
      rows: [],
      solveTimeMs,
      solverBackend: 'simplex-js',
      conflictingConstraints: model.constraints.map((c) => c.name),
    };
  }

  const columns: Record<string, VariableResult> = {};
  model.variables.forEach((v) => {
    const val = Number(lpResult[v.id] || 0);
    columns[v.id] = {
      name: v.name,
      varId: v.id,
      value: val,
      type: v.type,
      reducedCost: 0,
      lowerBound: v.lowerBound,
      upperBound: v.upperBound,
    };
  });

  const rows: ConstraintResult[] = model.constraints.map((c) => {
    let lhsValue = 0;
    model.variables.forEach((v) => {
      const coeff = c.terms[v.id] ?? 0;
      lhsValue += coeff * (columns[v.id]?.value || 0);
    });

    let slack = 0;
    if (c.operator === '<=') slack = c.rhs - lhsValue;
    else if (c.operator === '>=') slack = lhsValue - c.rhs;
    else slack = Math.abs(c.rhs - lhsValue);

    const isBinding = Math.abs(slack) < 1e-4;
    const utilizationPercent = c.rhs !== 0 ? Math.min(100, Math.max(0, (lhsValue / c.rhs) * 100)) : (isBinding ? 100 : 0);

    return {
      id: c.id,
      name: c.name,
      lhsValue: Math.round(lhsValue * 10000) / 10000,
      operator: c.operator,
      rhs: c.rhs,
      slack: Math.round(slack * 10000) / 10000,
      dualPrice: 0,
      isBinding,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
    };
  });

    const fallbackResult: SolveResult = {
      status: 'Optimal',
      statusMessage: 'Solución óptima encontrada con éxito.',
      objectiveValue: Math.round(Number(lpResult.result || 0) * 10000) / 10000,
      columns,
      rows,
      solveTimeMs,
      solverBackend: 'simplex-js',
    };

    fallbackResult.sensitivity = computeSensitivityRanging(model, fallbackResult);
    return fallbackResult;
}

/**
 * Executes solve via HiGHS WASM solver adapter, with graceful fallback if needed.
 */
export async function solveModelWithHighs(model: LPModel): Promise<SolveResult> {
  const startTime = performance.now();
  const formatMapping = modelToLPFormat(model);

  try {
    const highsInstance = await getHighsInstance();
    const rawResult = highsInstance.solve(formatMapping.lpString);
    const solveTimeMs = Math.max(0.5, Math.round((performance.now() - startTime) * 10) / 10);

    const rawStatus = (rawResult.Status || '').toLowerCase();

    if (rawStatus.includes('infeasible')) {
      return {
        status: 'Infeasible',
        statusMessage: 'El modelo no tiene ninguna solución factible que cumpla todas las restricciones.',
        objectiveValue: 0,
        columns: {},
        rows: [],
        solveTimeMs,
        solverBackend: 'highs-wasm',
        conflictingConstraints: model.constraints.map((c) => c.name),
      };
    }

    if (rawStatus.includes('unbounded')) {
      return {
        status: 'Unbounded',
        statusMessage: 'El modelo es no acotado: la función objetivo puede crecer o decrecer indefinidamente.',
        objectiveValue: 0,
        columns: {},
        rows: [],
        solveTimeMs,
        solverBackend: 'highs-wasm',
      };
    }

    if (!rawResult.Columns) {
      // Fallback
      return solveWithSimplexFallback(model, startTime);
    }

    // Process columns (variables)
    const columns: Record<string, VariableResult> = {};
    const sensVars: SensitivityVariable[] = [];

    model.variables.forEach((v) => {
      const cleanName = formatMapping.varIdToCleanName.get(v.id) || v.name;
      const col = rawResult.Columns?.[cleanName];

      const val = col ? Math.round(col.Primal * 10000) / 10000 : 0;
      const reducedCost = col ? Math.round((col.Dual || 0) * 10000) / 10000 : 0;

      columns[v.id] = {
        name: v.name,
        varId: v.id,
        value: val,
        type: v.type,
        reducedCost,
        lowerBound: v.lowerBound,
        upperBound: v.upperBound,
      };

      sensVars.push({
        name: v.name,
        varId: v.id,
        currentCoeff: model.objective.terms[v.id] ?? 0,
        reducedCost,
        minCoeff: null,
        maxCoeff: null,
      });
    });

    // Process rows (constraints)
    const rows: ConstraintResult[] = [];
    const sensConstraints: SensitivityConstraint[] = [];

    model.constraints.forEach((c) => {
      const cleanName = formatMapping.constraintIdToCleanName.get(c.id) || c.name;
      const row = rawResult.Rows?.find((r) => r.Name === cleanName);

      let lhsValue = 0;
      model.variables.forEach((v) => {
        const coeff = c.terms[v.id] ?? 0;
        lhsValue += coeff * (columns[v.id]?.value || 0);
      });

      let slack = 0;
      if (c.operator === '<=') slack = c.rhs - lhsValue;
      else if (c.operator === '>=') slack = lhsValue - c.rhs;
      else slack = Math.abs(c.rhs - lhsValue);

      const isBinding = Math.abs(slack) < 1e-4;
      const dualPrice = row ? Math.round((row.Dual || 0) * 10000) / 10000 : 0;
      const utilizationPercent = c.rhs !== 0 ? Math.min(100, Math.max(0, (lhsValue / c.rhs) * 100)) : (isBinding ? 100 : 0);

      const constraintResult: ConstraintResult = {
        id: c.id,
        name: c.name,
        lhsValue: Math.round(lhsValue * 10000) / 10000,
        operator: c.operator,
        rhs: c.rhs,
        slack: Math.round(slack * 10000) / 10000,
        dualPrice,
        isBinding,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      };
      rows.push(constraintResult);

      sensConstraints.push({
        name: c.name,
        id: c.id,
        currentRhs: c.rhs,
        dualPrice,
        minRhs: null,
        maxRhs: null,
      });
    });

    const initialResult: SolveResult = {
      status: 'Optimal',
      statusMessage: 'Solución óptima verificada con HiGHS WASM.',
      objectiveValue: Math.round(rawResult.ObjectiveValue * 10000) / 10000,
      columns,
      rows,
      solveTimeMs,
      solverBackend: 'highs-wasm',
    };

    const sensitivity = computeSensitivityRanging(model, initialResult);
    initialResult.sensitivity = sensitivity;

    return initialResult;
  } catch (wasmError) {
    console.warn('HiGHS execution note, applying simplex fallback:', wasmError);
    return solveWithSimplexFallback(model, startTime);
  }
}
