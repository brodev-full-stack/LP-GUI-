import { LPModel, Variable, Constraint } from '../solver/types';

export interface ValidationIssue {
  field: 'objective' | 'variable' | 'constraint' | 'general';
  targetId?: string;
  severity: 'error' | 'warning';
  messageKey: string;
  fallbackMessage: string;
}

export interface ModelValidationResult {
  isValid: boolean;
  canSolve: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Validates an LP model state for structural correctness and common formulation issues.
 */
export function validateModel(model: LPModel): ModelValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // General structural checks
  if (!model.variables || model.variables.length === 0) {
    errors.push({
      field: 'general',
      severity: 'error',
      messageKey: 'validation.noVariables',
      fallbackMessage: 'Se requiere al menos una variable para resolver el modelo.',
    });
  }

  if (!model.constraints || model.constraints.length === 0) {
    errors.push({
      field: 'general',
      severity: 'error',
      messageKey: 'validation.noConstraints',
      fallbackMessage: 'Se requiere al menos una restricción para acotar el problema.',
    });
  }

  // Variable validation
  const nameSet = new Set<string>();
  model.variables.forEach((v, index) => {
    const trimmed = v.name?.trim();
    if (!trimmed) {
      errors.push({
        field: 'variable',
        targetId: v.id,
        severity: 'error',
        messageKey: 'validation.emptyVarName',
        fallbackMessage: `La variable en la posición ${index + 1} debe tener un nombre.`,
      });
    } else {
      if (nameSet.has(trimmed.toLowerCase())) {
        errors.push({
          field: 'variable',
          targetId: v.id,
          severity: 'error',
          messageKey: 'validation.duplicateVarName',
          fallbackMessage: `Nombre de variable duplicado: "${trimmed}".`,
        });
      }
      nameSet.add(trimmed.toLowerCase());
    }

    // Bounds validation
    if (v.lowerBound !== null && isNaN(v.lowerBound)) {
      errors.push({
        field: 'variable',
        targetId: v.id,
        severity: 'error',
        messageKey: 'validation.invalidLowerBound',
        fallbackMessage: `Límite inferior no numérico para ${v.name}.`,
      });
    }
    if (v.upperBound !== null && isNaN(v.upperBound)) {
      errors.push({
        field: 'variable',
        targetId: v.id,
        severity: 'error',
        messageKey: 'validation.invalidUpperBound',
        fallbackMessage: `Límite superior no numérico para ${v.name}.`,
      });
    }
    if (v.lowerBound !== null && v.upperBound !== null && v.lowerBound > v.upperBound) {
      errors.push({
        field: 'variable',
        targetId: v.id,
        severity: 'error',
        messageKey: 'validation.invertedBounds',
        fallbackMessage: `El límite inferior (${v.lowerBound}) no puede superar al límite superior (${v.upperBound}) en ${v.name}.`,
      });
    }

    if (v.type === 'binary' && v.lowerBound !== null && (v.lowerBound < 0 || v.lowerBound > 1)) {
      warnings.push({
        field: 'variable',
        targetId: v.id,
        severity: 'warning',
        messageKey: 'validation.binaryBoundWarning',
        fallbackMessage: `La variable binaria ${v.name} solo puede tomar valores 0 o 1.`,
      });
    }
  });

  // Objective check
  let hasNonZeroObjCoeff = false;
  model.variables.forEach((v) => {
    const coeff = model.objective.terms[v.id];
    if (coeff !== undefined && coeff !== null) {
      if (isNaN(coeff)) {
        errors.push({
          field: 'objective',
          targetId: v.id,
          severity: 'error',
          messageKey: 'validation.nanObjectiveCoeff',
          fallbackMessage: `Coeficiente no numérico en la función objetivo para ${v.name}.`,
        });
      } else if (coeff !== 0) {
        hasNonZeroObjCoeff = true;
      }
    }
  });

  if (!hasNonZeroObjCoeff && model.variables.length > 0) {
    warnings.push({
      field: 'objective',
      severity: 'warning',
      messageKey: 'validation.zeroObjective',
      fallbackMessage: 'Todos los coeficientes de la función objetivo son 0 (problema de factibilidad pura).',
    });
  }

  // Constraints validation
  const cNameSet = new Set<string>();
  model.constraints.forEach((c, index) => {
    const trimmed = c.name?.trim();
    if (!trimmed) {
      errors.push({
        field: 'constraint',
        targetId: c.id,
        severity: 'error',
        messageKey: 'validation.emptyConstraintName',
        fallbackMessage: `La restricción ${index + 1} debe tener un nombre.`,
      });
    } else {
      if (cNameSet.has(trimmed.toLowerCase())) {
        errors.push({
          field: 'constraint',
          targetId: c.id,
          severity: 'error',
          messageKey: 'validation.duplicateConstraintName',
          fallbackMessage: `Nombre de restricción duplicado: "${trimmed}".`,
        });
      }
      cNameSet.add(trimmed.toLowerCase());
    }

    if (isNaN(c.rhs) || c.rhs === null || c.rhs === undefined) {
      errors.push({
        field: 'constraint',
        targetId: c.id,
        severity: 'error',
        messageKey: 'validation.nanRhs',
        fallbackMessage: `El lado derecho (RHS) de la restricción "${c.name}" no es válido.`,
      });
    }

    let hasNonZeroLhs = false;
    model.variables.forEach((v) => {
      const coeff = c.terms[v.id];
      if (coeff !== undefined && coeff !== null) {
        if (isNaN(coeff)) {
          errors.push({
            field: 'constraint',
            targetId: c.id,
            severity: 'error',
            messageKey: 'validation.nanConstraintCoeff',
            fallbackMessage: `Coeficiente no válido para ${v.name} en "${c.name}".`,
          });
        } else if (coeff !== 0) {
          hasNonZeroLhs = true;
        }
      }
    });

    if (!hasNonZeroLhs) {
      warnings.push({
        field: 'constraint',
        targetId: c.id,
        severity: 'warning',
        messageKey: 'validation.emptyLhs',
        fallbackMessage: `La restricción "${c.name}" tiene todos los coeficientes en 0.`,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    canSolve: errors.length === 0 && model.variables.length > 0 && model.constraints.length > 0,
    errors,
    warnings,
  };
}
