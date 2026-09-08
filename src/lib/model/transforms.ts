import { LPModel, Variable, Constraint } from '../solver/types';

/**
 * Clean variable identifier for standard LP format.
 * HiGHS and standard LP format expect alphanumeric characters or underscores.
 */
export function sanitizeVarName(name: string, fallbackId: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  if (!cleaned || /^[0-9]/.test(cleaned)) {
    return `v_${cleaned || fallbackId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }
  return cleaned;
}

export interface LPFormatMapping {
  lpString: string;
  varIdToCleanName: Map<string, string>;
  cleanNameToVarId: Map<string, string>;
  constraintIdToCleanName: Map<string, string>;
  cleanNameToConstraintId: Map<string, string>;
}

/**
 * Converts internal LPModel state into standard CPLEX LP format accepted by HiGHS.
 */
export function modelToLPFormat(model: LPModel): LPFormatMapping {
  const varIdToCleanName = new Map<string, string>();
  const cleanNameToVarId = new Map<string, string>();
  const constraintIdToCleanName = new Map<string, string>();
  const cleanNameToConstraintId = new Map<string, string>();

  // Assign clean identifiers to avoid clashes
  const usedVarNames = new Set<string>();
  model.variables.forEach((v, idx) => {
    let clean = sanitizeVarName(v.name || `x${idx + 1}`, v.id);
    let counter = 1;
    while (usedVarNames.has(clean)) {
      clean = `${clean}_${counter++}`;
    }
    usedVarNames.add(clean);
    varIdToCleanName.set(v.id, clean);
    cleanNameToVarId.set(clean, v.id);
  });

  const usedConstraintNames = new Set<string>();
  model.constraints.forEach((c, idx) => {
    let clean = sanitizeVarName(c.name || `c${idx + 1}`, c.id);
    let counter = 1;
    while (usedConstraintNames.has(clean)) {
      clean = `${clean}_${counter++}`;
    }
    usedConstraintNames.add(clean);
    constraintIdToCleanName.set(c.id, clean);
    cleanNameToConstraintId.set(clean, c.id);
  });

  const lines: string[] = [];

  // 1. Objective function
  lines.push(model.objective.direction === 'minimize' ? 'Minimize' : 'Maximize');
  const objTerms: string[] = [];
  model.variables.forEach((v) => {
    const coeff = model.objective.terms[v.id] ?? 0;
    if (coeff !== 0) {
      const cleanVar = varIdToCleanName.get(v.id)!;
      const sign = coeff >= 0 ? '+' : '-';
      const absCoeff = Math.abs(coeff);
      const coeffStr = absCoeff === 1 ? '' : `${absCoeff} `;
      objTerms.push(`${sign} ${coeffStr}${cleanVar}`);
    }
  });

  if (objTerms.length === 0) {
    // If no objective terms, add 0 * first var
    const firstVar = varIdToCleanName.get(model.variables[0]?.id || '') || 'x1';
    lines.push(` obj: 0 ${firstVar}`);
  } else {
    let expr = objTerms.join(' ');
    if (expr.startsWith('+ ')) expr = expr.slice(2);
    lines.push(` obj: ${expr}`);
  }

  // 2. Constraints (Subject To)
  lines.push('Subject To');
  model.constraints.forEach((c) => {
    const cleanName = constraintIdToCleanName.get(c.id)!;
    const rowTerms: string[] = [];

    model.variables.forEach((v) => {
      const coeff = c.terms[v.id] ?? 0;
      if (coeff !== 0) {
        const cleanVar = varIdToCleanName.get(v.id)!;
        const sign = coeff >= 0 ? '+' : '-';
        const absCoeff = Math.abs(coeff);
        const coeffStr = absCoeff === 1 ? '' : `${absCoeff} `;
        rowTerms.push(`${sign} ${coeffStr}${cleanVar}`);
      }
    });

    let lhs = rowTerms.length > 0 ? rowTerms.join(' ') : '0';
    if (lhs.startsWith('+ ')) lhs = lhs.slice(2);

    let op = '<=';
    if (c.operator === '=') op = '=';
    else if (c.operator === '>=') op = '>=';

    lines.push(` ${cleanName}: ${lhs} ${op} ${c.rhs}`);
  });

  // 3. Bounds
  lines.push('Bounds');
  model.variables.forEach((v) => {
    const cleanVar = varIdToCleanName.get(v.id)!;

    if (v.type === 'binary') {
      // Binary bounds handled in Binary section
      return;
    }

    const lb = v.lowerBound;
    const ub = v.upperBound;

    if (lb === null && ub === null) {
      lines.push(` ${cleanVar} free`);
    } else if (lb !== null && ub !== null) {
      lines.push(` ${lb} <= ${cleanVar} <= ${ub}`);
    } else if (lb !== null && ub === null) {
      lines.push(` ${lb} <= ${cleanVar}`);
    } else if (lb === null && ub !== null) {
      lines.push(` -infinity <= ${cleanVar} <= ${ub}`);
    }
  });

  // 4. Generals / Integers
  const integerVars = model.variables.filter((v) => v.type === 'integer');
  if (integerVars.length > 0) {
    lines.push('General');
    integerVars.forEach((v) => {
      lines.push(` ${varIdToCleanName.get(v.id)!}`);
    });
  }

  // 5. Binary
  const binaryVars = model.variables.filter((v) => v.type === 'binary');
  if (binaryVars.length > 0) {
    lines.push('Binary');
    binaryVars.forEach((v) => {
      lines.push(` ${varIdToCleanName.get(v.id)!}`);
    });
  }

  lines.push('End');

  return {
    lpString: lines.join('\n'),
    varIdToCleanName,
    cleanNameToVarId,
    constraintIdToCleanName,
    cleanNameToConstraintId,
  };
}
