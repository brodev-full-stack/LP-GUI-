/**
 * Custom error classes for LP Studio solver module.
 * Maps solver execution issues to typed, user-friendly error hierarchies.
 */

export class SolverError extends Error {
  public code: string;
  public details?: unknown;

  constructor(message: string, code: string = 'SOLVER_ERROR', details?: unknown) {
    super(message);
    this.name = 'SolverError';
    this.code = code;
    this.details = details;
  }
}

export class InfeasibleError extends SolverError {
  public conflictingConstraints: string[];

  constructor(message: string = 'The model has no feasible solution satisfying all constraints.', conflicting: string[] = []) {
    super(message, 'MODEL_INFEASIBLE', { conflicting });
    this.name = 'InfeasibleError';
    this.conflictingConstraints = conflicting;
  }
}

export class UnboundedError extends SolverError {
  public direction?: Record<string, number>;

  constructor(message: string = 'The objective value can grow indefinitely without violating bounds.', direction?: Record<string, number>) {
    super(message, 'MODEL_UNBOUNDED', { direction });
    this.name = 'UnboundedError';
    this.direction = direction;
  }
}

export class NumericalIssueError extends SolverError {
  constructor(message: string = 'Numerical instability or scaling issues encountered in solver.') {
    super(message, 'NUMERICAL_ISSUE');
    this.name = 'NumericalIssueError';
  }
}
