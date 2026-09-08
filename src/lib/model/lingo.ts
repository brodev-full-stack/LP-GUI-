import { LPModel, Variable, Constraint, ObjectiveDirection, VariableType, ConstraintOperator } from '../solver/types';
import { generateUniqueId } from './index';

/**
 * Serializes an LPModel into standard LINGO syntax.
 */
export function modelToLingo(model: LPModel): string {
  const lines: string[] = [];

  lines.push(`! ==========================================;`);
  lines.push(`! MODELO: ${model.name || 'LP Studio'};`);
  if (model.description) {
    lines.push(`! ${model.description};`);
  }
  lines.push(`! ==========================================;`);
  lines.push('');

  // 1. Objective function
  const dir = model.objective.direction === 'maximize' ? 'MAX' : 'MIN';
  const objTerms = model.variables
    .map((v) => {
      const coeff = model.objective.terms[v.id] ?? 0;
      if (coeff === 0) return null;
      const sign = coeff < 0 ? '-' : '+';
      const absCoeff = Math.abs(coeff);
      const coeffStr = absCoeff === 1 ? '' : `${absCoeff}*`;
      return { sign, str: `${coeffStr}${v.name}` };
    })
    .filter(Boolean) as { sign: string; str: string }[];

  let objExpr = '0';
  if (objTerms.length > 0) {
    objExpr = objTerms
      .map((term, i) => {
        if (i === 0) {
          return term.sign === '-' ? `-${term.str}` : term.str;
        }
        return `${term.sign} ${term.str}`;
      })
      .join(' ');
  }

  lines.push(`[OBJ] ${dir} = ${objExpr};`);
  lines.push('');

  // 2. Constraints
  lines.push(`! RESTRICCIONES;`);
  model.constraints.forEach((c) => {
    const terms = model.variables
      .map((v) => {
        const coeff = c.terms[v.id] ?? 0;
        if (coeff === 0) return null;
        const sign = coeff < 0 ? '-' : '+';
        const absCoeff = Math.abs(coeff);
        const coeffStr = absCoeff === 1 ? '' : `${absCoeff}*`;
        return { sign, str: `${coeffStr}${v.name}` };
      })
      .filter(Boolean) as { sign: string; str: string }[];

    let lhs = '0';
    if (terms.length > 0) {
      lhs = terms
        .map((t, i) => {
          if (i === 0) {
            return t.sign === '-' ? `-${t.str}` : t.str;
          }
          return `${t.sign} ${t.str}`;
        })
        .join(' ');
    }

    const op = c.operator === '<=' ? '<=' : c.operator === '>=' ? '>=' : '=';
    lines.push(`[${c.name.replace(/\s+/g, '_')}] ${lhs} ${op} ${c.rhs};`);
  });
  lines.push('');

  // 3. Variable types and bounds (@GIN, @BIN, @BND)
  const specialVars = model.variables.filter(
    (v) => v.type !== 'continuous' || v.lowerBound !== 0 || v.upperBound !== null
  );

  if (specialVars.length > 0) {
    lines.push(`! TIPOS DE VARIABLE Y COTAS;`);
    specialVars.forEach((v) => {
      if (v.type === 'integer') {
        lines.push(`@GIN(${v.name});`);
      } else if (v.type === 'binary') {
        lines.push(`@BIN(${v.name});`);
      }
      if (v.lowerBound !== null && v.upperBound !== null) {
        lines.push(`@BND(${v.lowerBound}, ${v.name}, ${v.upperBound});`);
      } else {
        if (v.lowerBound !== null && v.lowerBound !== 0) {
          lines.push(`${v.name} >= ${v.lowerBound};`);
        }
        if (v.upperBound !== null) {
          lines.push(`${v.name} <= ${v.upperBound};`);
        }
      }
    });
    lines.push('');
  }

  lines.push('END');
  return lines.join('\n');
}

/**
 * Parses LINGO / Algebraic LP text into an LPModel structure.
 */
export function parseLingoToModel(lingoCode: string): { model: LPModel; errors: string[] } {
  const errors: string[] = [];
  const varMap = new Map<string, Variable>();
  const constraints: Constraint[] = [];
  let direction: ObjectiveDirection = 'maximize';
  const objTerms: Record<string, number> = {};

  const getOrCreateVar = (name: string): Variable => {
    const cleanName = name.trim();
    if (!varMap.has(cleanName)) {
      const v: Variable = {
        id: generateUniqueId('v'),
        name: cleanName,
        type: 'continuous',
        lowerBound: 0,
        upperBound: null,
      };
      varMap.set(cleanName, v);
    }
    return varMap.get(cleanName)!;
  };

  // Helper to parse algebraic polynomial: e.g. "3*x1 - 4.5*x2 + x3"
  const parseTerms = (expr: string): Record<string, number> => {
    const terms: Record<string, number> = {};
    // Normalize spaces and signs
    const normalized = expr
      .replace(/\s+/g, '')
      .replace(/\+/g, ' +')
      .replace(/-/g, ' -')
      .trim();

    if (!normalized) return terms;

    const parts = normalized.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (!part) continue;
      // Match sign, coefficient, star, variable name
      const m = part.match(/^([+-])?([0-9]+(?:\.[0-9]+)?)?(?:\*|x|X)?([a-zA-Z_][a-zA-Z0-9_]*)?$/);
      if (m) {
        const sign = m[1] === '-' ? -1 : 1;
        const numStr = m[2];
        const vName = m[3];

        if (vName) {
          const coeff = (numStr !== undefined ? parseFloat(numStr) : 1) * sign;
          const v = getOrCreateVar(vName);
          terms[v.id] = (terms[v.id] || 0) + coeff;
        }
      } else {
        // Fallback loose regex
        const loose = part.match(/([+-]?[0-9]*\.?[0-9]*)\*?([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (loose && loose[2]) {
          let coeff = 1;
          if (loose[1] === '-' || loose[1] === '') coeff = loose[1] === '-' ? -1 : 1;
          else if (loose[1] === '+') coeff = 1;
          else coeff = parseFloat(loose[1]);
          const v = getOrCreateVar(loose[2]);
          terms[v.id] = (terms[v.id] || 0) + coeff;
        }
      }
    }
    return terms;
  };

  // Remove comment blocks and split by semicolons or lines
  // LINGO comments: ! ... ;
  const cleanCode = lingoCode.replace(/![^;]*;/g, '').replace(/END/gi, '');
  const statements = cleanCode
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Check for Objective: MAX = ... or MIN = ...
    const objMatch = stmt.match(/^(?:\[[^\]]+\]\s*)?(MAX|MIN)\s*[:=]\s*(.+)$/i);
    if (objMatch) {
      direction = objMatch[1].toUpperCase() === 'MAX' ? 'maximize' : 'minimize';
      const parsedObj = parseTerms(objMatch[2]);
      Object.assign(objTerms, parsedObj);
      continue;
    }

    // Check for @GIN(var)
    const ginMatch = stmt.match(/@GIN\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/i);
    if (ginMatch) {
      const v = getOrCreateVar(ginMatch[1]);
      v.type = 'integer';
      continue;
    }

    // Check for @BIN(var)
    const binMatch = stmt.match(/@BIN\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/i);
    if (binMatch) {
      const v = getOrCreateVar(binMatch[1]);
      v.type = 'binary';
      v.lowerBound = 0;
      v.upperBound = 1;
      continue;
    }

    // Check for @BND(l, var, u)
    const bndMatch = stmt.match(/@BND\s*\(\s*([+-]?[0-9.]+)\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([+-]?[0-9.]+)\s*\)/i);
    if (bndMatch) {
      const v = getOrCreateVar(bndMatch[2]);
      v.lowerBound = parseFloat(bndMatch[1]);
      v.upperBound = parseFloat(bndMatch[3]);
      continue;
    }

    // Check for simple bounds like x1 >= 5 or x2 <= 20
    const boundMatch = stmt.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(<=|>=|=)\s*([+-]?[0-9.]+)$/);
    if (boundMatch) {
      const v = getOrCreateVar(boundMatch[1]);
      const op = boundMatch[2];
      const val = parseFloat(boundMatch[3]);
      if (op === '<=') v.upperBound = val;
      else if (op === '>=') v.lowerBound = val;
      else {
        v.lowerBound = val;
        v.upperBound = val;
      }
      continue;
    }

    // Check for constraint: [Name] LHS (<= | >= | =) RHS
    const constrMatch = stmt.match(/^(?:\[([^\]]+)\]\s*)?(.+?)\s*(<=|>=|=)\s*([+-]?[0-9.]+)\s*$/);
    if (constrMatch) {
      const customName = constrMatch[1]?.trim();
      const lhsExpr = constrMatch[2].trim();
      const opStr = constrMatch[3];
      const rhsVal = parseFloat(constrMatch[4]);

      const terms = parseTerms(lhsExpr);
      const operator: ConstraintOperator = opStr === '<=' ? '<=' : opStr === '>=' ? '>=' : '=';

      constraints.push({
        id: generateUniqueId('c'),
        name: customName || `R${constraints.length + 1}`,
        terms,
        operator,
        rhs: isNaN(rhsVal) ? 0 : rhsVal,
      });
      continue;
    }

    if (stmt.length > 2) {
      errors.push(`Instrucción no reconocida: "${stmt}"`);
    }
  }

  const variables = Array.from(varMap.values());

  const model: LPModel = {
    id: generateUniqueId('model'),
    name: 'Modelo LINGO',
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction,
      terms: objTerms,
    },
    variables,
    constraints,
  };

  return { model, errors };
}

/**
 * Computes the complete Mathematical Dual formulation of the LP problem.
 */
export function generateDualProblem(primal: LPModel): {
  dualObjective: string;
  dualConstraints: Array<{ name: string; expression: string }>;
  dualVariables: Array<{ name: string; bounds: string }>;
} {
  const isMax = primal.objective.direction === 'maximize';
  const dualDir = isMax ? 'MIN' : 'MAX';

  // Dual variables: one per primal constraint (y1, y2, ...)
  const dualVars = primal.constraints.map((c, idx) => ({
    id: `y_${idx + 1}`,
    name: `y${idx + 1}`,
    bound: c.operator === '<=' ? (isMax ? '>= 0' : '<= 0') : c.operator === '>=' ? (isMax ? '<= 0' : '>= 0') : 'libre (irrestricta)',
    rhs: c.rhs,
    primalName: c.name,
  }));

  // Dual Objective: W = sum(b_i * y_i)
  const objParts = dualVars
    .map((dv) => {
      if (dv.rhs === 0) return null;
      const sign = dv.rhs < 0 ? '-' : '+';
      const absCoeff = Math.abs(dv.rhs);
      const coeffStr = absCoeff === 1 ? '' : `${absCoeff}*`;
      return `${sign} ${coeffStr}${dv.name}`;
    })
    .filter(Boolean);

  let dualObjExpr = '0';
  if (objParts.length > 0) {
    dualObjExpr = objParts.join(' ').replace(/^\+\s*/, '');
  }
  const dualObjective = `${dualDir} W = ${dualObjExpr}`;

  // Dual Constraints: one per primal variable
  // sum_i(a_ij * y_i) >= c_j (for primal max with x_j >= 0)
  const dualConstraints = primal.variables.map((v) => {
    const cCoeff = primal.objective.terms[v.id] ?? 0;
    const lhsParts: string[] = [];

    primal.constraints.forEach((c, idx) => {
      const a = c.terms[v.id] ?? 0;
      if (a !== 0) {
        const sign = a < 0 ? '-' : '+';
        const absA = Math.abs(a);
        const coeffStr = absA === 1 ? '' : `${absA}*`;
        lhsParts.push(`${sign} ${coeffStr}${dualVars[idx].name}`);
      }
    });

    const lhsStr = lhsParts.length > 0 ? lhsParts.join(' ').replace(/^\+\s*/, '') : '0';
    const op = isMax ? '>=' : '<=';

    return {
      name: `Asociada a ${v.name}`,
      expression: `${lhsStr} ${op} ${cCoeff}`,
    };
  });

  const dualVariables = dualVars.map((dv) => ({
    name: `${dv.name} (${dv.primalName})`,
    bounds: dv.bound,
  }));

  return {
    dualObjective,
    dualConstraints,
    dualVariables,
  };
}
