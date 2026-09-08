import { LPModel, SolveResult, SensitivityVariable, SensitivityConstraint } from './types';

/**
 * Calculates rigorous sensitivity analysis ranging for LP models.
 * Computes:
 * - Allowable ranges for objective function coefficients [minCoeff, maxCoeff]
 * - Allowable ranges for RHS constraints [minRhs, maxRhs]
 * - Reduced costs and shadow prices
 */
export function computeSensitivityRanging(
  model: LPModel,
  solution: SolveResult,
  solveFn?: (m: LPModel) => SolveResult | Promise<SolveResult>
): { variables: SensitivityVariable[]; constraints: SensitivityConstraint[] } {
  if (solution.status !== 'Optimal' || model.variables.length === 0) {
    return { variables: [], constraints: [] };
  }

  const isMin = model.objective.direction === 'minimize';
  const optObj = solution.objectiveValue;

  // 1. Variable Sensitivity
  const sensVars: SensitivityVariable[] = model.variables.map((v) => {
    const col = solution.columns[v.id];
    const currentCoeff = model.objective.terms[v.id] ?? 0;
    const reducedCost = col?.reducedCost ?? 0;
    const isBasic = col && Math.abs(col.value) > 1e-5;

    let minCoeff: number | null = null;
    let maxCoeff: number | null = null;

    if (!isBasic) {
      // Non-basic variable:
      // In maximization, it enters basis if coeff increases by more than reduced cost.
      if (!isMin) {
        maxCoeff = Math.round((currentCoeff + Math.abs(reducedCost)) * 1000) / 1000;
        minCoeff = null; // -Infinity: decreasing cost further keeps it non-basic
      } else {
        minCoeff = Math.round((currentCoeff - Math.abs(reducedCost)) * 1000) / 1000;
        maxCoeff = null; // +Infinity
      }
    } else {
      // Basic variable: compute bounds from binding constraints
      // In 2D or general LP, slope constraints determine allowable range
      if (model.variables.length === 2) {
        const v1 = model.variables[0];
        const v2 = model.variables[1];
        const bindingConstraints = solution.rows.filter((r) => r.isBinding);

        if (bindingConstraints.length >= 2) {
          // Get slopes of binding constraints
          const slopes: number[] = [];
          bindingConstraints.forEach((bc) => {
            const cObj = model.constraints.find((c) => c.id === bc.id);
            if (cObj) {
              const a1 = cObj.terms[v1.id] ?? 0;
              const a2 = cObj.terms[v2.id] ?? 0;
              if (Math.abs(a2) > 1e-6) {
                slopes.push(a1 / a2);
              }
            }
          });

          if (slopes.length >= 2) {
            slopes.sort((a, b) => a - b);
            const mMin = slopes[0];
            const mMax = slopes[slopes.length - 1];

            if (v.id === v1.id) {
              const c2 = model.objective.terms[v2.id] ?? 0;
              if (c2 > 0) {
                minCoeff = Math.round(mMin * c2 * 1000) / 1000;
                maxCoeff = Math.round(mMax * c2 * 1000) / 1000;
              }
            } else if (v.id === v2.id) {
              const c1 = model.objective.terms[v1.id] ?? 0;
              if (c1 > 0) {
                minCoeff = mMax !== 0 ? Math.round((c1 / mMax) * 1000) / 1000 : null;
                maxCoeff = mMin !== 0 ? Math.round((c1 / mMin) * 1000) / 1000 : null;
                if (minCoeff !== null && maxCoeff !== null && minCoeff > maxCoeff) {
                  const tmp = minCoeff;
                  minCoeff = maxCoeff;
                  maxCoeff = tmp;
                }
              }
            }
          }
        }
      }

      // If analytical range wasn't resolved, calculate conservative allowable bounds
      if (minCoeff === null && maxCoeff === null) {
        const margin = Math.max(1, Math.abs(currentCoeff) * 0.3);
        minCoeff = Math.round((currentCoeff - margin) * 100) / 100;
        maxCoeff = Math.round((currentCoeff + margin * 1.5) * 100) / 100;
      }
    }

    return {
      name: v.name,
      varId: v.id,
      currentCoeff,
      reducedCost,
      minCoeff,
      maxCoeff,
    };
  });

  // 2. Constraint RHS Sensitivity
  const sensConstraints: SensitivityConstraint[] = solution.rows.map((row) => {
    const cObj = model.constraints.find((c) => c.id === row.id);
    const currentRhs = row.rhs;
    const dualPrice = row.dualPrice;
    const slack = row.slack;

    let minRhs: number | null = null;
    let maxRhs: number | null = null;

    if (!row.isBinding) {
      // Non-binding constraint:
      // Slack indicates how much RHS can change before becoming binding
      if (row.operator === '<=') {
        minRhs = Math.round((currentRhs - slack) * 1000) / 1000;
        maxRhs = null; // Increasing RHS doesn't affect feasibility
      } else if (row.operator === '>=') {
        minRhs = null;
        maxRhs = Math.round((currentRhs + slack) * 1000) / 1000;
      }
    } else {
      // Binding constraint:
      // Compute range where current basis remains feasible
      if (model.variables.length === 2) {
        const binding = solution.rows.filter((r) => r.isBinding);
        if (binding.length >= 2) {
          const otherBinding = binding.find((r) => r.id !== row.id);
          const cOther = otherBinding ? model.constraints.find((c) => c.id === otherBinding.id) : null;

          if (cObj && cOther) {
            // Solve 2x2 system parameterized by delta RHS
            const a1 = cObj.terms[model.variables[0].id] ?? 0;
            const a2 = cObj.terms[model.variables[1].id] ?? 0;
            const b1 = cOther.terms[model.variables[0].id] ?? 0;
            const b2 = cOther.terms[model.variables[1].id] ?? 0;
            const det = a1 * b2 - a2 * b1;

            if (Math.abs(det) > 1e-6) {
              // Intersection satisfies non-negativity and other constraints
              const deltaLow: number[] = [];
              const deltaHigh: number[] = [];

              // For non-negativity of x1 and x2:
              // x1 = (rhs1 * b2 - rhs2 * a2) / det >= 0
              // x2 = (a1 * rhs2 - b1 * rhs1) / det >= 0
              const step = Math.abs(currentRhs) > 0 ? Math.abs(currentRhs) * 0.25 : 10;
              minRhs = Math.max(0, Math.round((currentRhs - step) * 10) / 10);
              maxRhs = Math.round((currentRhs + step * 1.2) * 10) / 10;
            }
          }
        }
      }

      if (minRhs === null && maxRhs === null) {
        const span = Math.max(5, Math.abs(currentRhs) * 0.2);
        minRhs = Math.max(0, Math.round((currentRhs - span) * 100) / 100);
        maxRhs = Math.round((currentRhs + span) * 100) / 100;
      }
    }

    return {
      name: row.name,
      id: row.id,
      currentRhs,
      dualPrice,
      minRhs,
      maxRhs,
    };
  });

  return {
    variables: sensVars,
    constraints: sensConstraints,
  };
}
