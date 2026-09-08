import { LPModel, SolveResult, Variable, Constraint } from '../solver/types';
import { generateUniqueId } from '../model';

export function modelToCSV(model: LPModel): string {
  const lines: string[] = [];

  // Metadata
  lines.push(`## Model Name,${escapeCSV(model.name)}`);
  lines.push(`## Objective Direction,${model.objective.direction}`);
  lines.push('');

  // Variables section
  lines.push('# VARIABLES');
  lines.push('Name,Type,LowerBound,UpperBound,ObjectiveCoefficient');
  model.variables.forEach((v) => {
    const coeff = model.objective.terms[v.id] ?? 0;
    const lb = v.lowerBound !== null ? v.lowerBound : '';
    const ub = v.upperBound !== null ? v.upperBound : '';
    lines.push(`${escapeCSV(v.name)},${v.type},${lb},${ub},${coeff}`);
  });
  lines.push('');

  // Constraints section
  lines.push('# CONSTRAINTS');
  const varNamesHeader = model.variables.map((v) => escapeCSV(v.name)).join(',');
  lines.push(`ConstraintName,${varNamesHeader},Operator,RHS`);

  model.constraints.forEach((c) => {
    const coeffs = model.variables.map((v) => c.terms[v.id] ?? 0).join(',');
    lines.push(`${escapeCSV(c.name)},${coeffs},${c.operator},${c.rhs}`);
  });

  return lines.join('\n');
}

export function resultsToCSV(result: SolveResult): string {
  const lines: string[] = [];

  lines.push(`## Status,${result.status}`);
  lines.push(`## Optimal Objective Value,${result.objectiveValue}`);
  lines.push(`## Solve Time (ms),${result.solveTimeMs}`);
  lines.push(`## Solver Engine,${result.solverBackend}`);
  lines.push('');

  lines.push('# VARIABLE VALUES');
  lines.push('Variable,OptimalValue,Type,ReducedCost,LowerBound,UpperBound');
  Object.values(result.columns).forEach((col) => {
    const lb = col.lowerBound !== null ? col.lowerBound : '';
    const ub = col.upperBound !== null ? col.upperBound : '';
    lines.push(`${escapeCSV(col.name)},${col.value},${col.type},${col.reducedCost},${lb},${ub}`);
  });
  lines.push('');

  lines.push('# CONSTRAINT STATUS');
  lines.push('Constraint,LHSValue,Operator,RHS,SlackSurplus,DualPrice,Binding,UtilizationPercent');
  result.rows.forEach((row) => {
    lines.push(
      `${escapeCSV(row.name)},${row.lhsValue},${row.operator},${row.rhs},${row.slack},${row.dualPrice},${row.isBinding},${row.utilizationPercent}%`
    );
  });

  return lines.join('\n');
}

function escapeCSV(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCSVToModel(csvText: string): LPModel {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let modelName = 'Modelo Importado';
  let direction: 'maximize' | 'minimize' = 'maximize';
  const variables: Variable[] = [];
  const constraints: Constraint[] = [];
  const objectiveTerms: Record<string, number> = {};

  let currentSection: 'header' | 'variables' | 'constraints' = 'header';
  const varNameToIdMap = new Map<string, string>();
  let constraintVarHeaders: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## Model Name,')) {
      modelName = line.replace('## Model Name,', '').trim().replace(/^"|"$/g, '');
      continue;
    }
    if (line.startsWith('## Objective Direction,')) {
      const d = line.replace('## Objective Direction,', '').trim().toLowerCase();
      direction = d === 'minimize' ? 'minimize' : 'maximize';
      continue;
    }

    if (line.startsWith('# VARIABLES')) {
      currentSection = 'variables';
      continue;
    }
    if (line.startsWith('# CONSTRAINTS')) {
      currentSection = 'constraints';
      continue;
    }

    if (currentSection === 'variables') {
      if (line.startsWith('Name,Type')) continue; // skip header
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        const name = parts[0] || `x${variables.length + 1}`;
        const typeStr = parts[1]?.toLowerCase();
        const type: 'continuous' | 'integer' | 'binary' =
          typeStr === 'integer' || typeStr === 'binary' ? typeStr : 'continuous';
        const lb = parts[2] !== '' && !isNaN(Number(parts[2])) ? Number(parts[2]) : 0;
        const ub = parts[3] !== '' && !isNaN(Number(parts[3])) ? Number(parts[3]) : null;
        const objCoeff = parts[4] !== '' && !isNaN(Number(parts[4])) ? Number(parts[4]) : 0;

        const id = generateUniqueId('v');
        varNameToIdMap.set(name.toLowerCase(), id);

        variables.push({
          id,
          name,
          type,
          lowerBound: lb,
          upperBound: ub,
        });
        objectiveTerms[id] = objCoeff;
      }
    } else if (currentSection === 'constraints') {
      if (line.startsWith('ConstraintName,')) {
        // read constraint variable order
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        constraintVarHeaders = parts.slice(1, parts.length - 2);
        continue;
      }

      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 4) {
        const name = parts[0];
        const rhs = Number(parts[parts.length - 1]) || 0;
        const opStr = parts[parts.length - 2];
        const operator: '<=' | '=' | '>=' = opStr === '>=' || opStr === '=' ? opStr : '<=';

        const terms: Record<string, number> = {};
        const coeffValues = parts.slice(1, parts.length - 2);

        coeffValues.forEach((valStr, idx) => {
          const varHeader = constraintVarHeaders[idx]?.toLowerCase();
          const varId = varHeader ? varNameToIdMap.get(varHeader) : variables[idx]?.id;
          if (varId) {
            terms[varId] = Number(valStr) || 0;
          }
        });

        constraints.push({
          id: generateUniqueId('c'),
          name,
          operator,
          rhs,
          terms,
        });
      }
    }
  }

  return {
    id: generateUniqueId('model'),
    name: modelName,
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction,
      terms: objectiveTerms,
    },
    variables: variables.length > 0 ? variables : [
      { id: 'v1', name: 'x1', type: 'continuous', lowerBound: 0, upperBound: null },
      { id: 'v2', name: 'x2', type: 'continuous', lowerBound: 0, upperBound: null },
    ],
    constraints,
  };
}
