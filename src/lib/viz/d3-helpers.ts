import { LPModel, Constraint, SolveResult } from '../solver/types';

export interface Point2D {
  x: number;
  y: number;
}

export interface FeasibleRegionData {
  polygonVertices: Point2D[];
  constraintLines: Array<{
    id: string;
    name: string;
    operator: string;
    rhs: number;
    a: number; // Coeff of x
    b: number; // Coeff of y
    color: string;
    points: [Point2D, Point2D]; // Two endpoints intersecting the bounding box
  }>;
  xRange: [number, number];
  yRange: [number, number];
  optimalPoint: Point2D | null;
  optimalZ: number | null;
  objCoeffs: { c1: number; c2: number; isMin: boolean };
}

const EPSILON = 1e-6;

/**
 * Computes the 2D feasible polygon, bounding box, constraint lines, and optimal point.
 */
export function compute2DFeasibleRegion(model: LPModel, solution?: SolveResult | null): FeasibleRegionData | null {
  if (model.variables.length !== 2) return null;

  const v1 = model.variables[0];
  const v2 = model.variables[1];

  const c1 = model.objective.terms[v1.id] ?? 0;
  const c2 = model.objective.terms[v2.id] ?? 0;
  const isMin = model.objective.direction === 'minimize';

  // Lower and upper bounds
  const xMin = v1.lowerBound !== null ? v1.lowerBound : 0;
  const yMin = v2.lowerBound !== null ? v2.lowerBound : 0;

  // Let's collect lines: a * x + b * y = rhs
  interface HalfPlane {
    a: number;
    b: number;
    rhs: number;
    op: '<=' | '>=' | '=';
    id: string;
    name: string;
  }

  const halfPlanes: HalfPlane[] = [];

  // Add lower bounds as half-planes: x >= xMin -> -x <= -xMin
  halfPlanes.push({ a: 1, b: 0, rhs: xMin, op: '>=', id: '_bnd_x_min', name: `${v1.name} >= ${xMin}` });
  halfPlanes.push({ a: 0, b: 1, rhs: yMin, op: '>=', id: '_bnd_y_min', name: `${v2.name} >= ${yMin}` });

  if (v1.upperBound !== null) {
    halfPlanes.push({ a: 1, b: 0, rhs: v1.upperBound, op: '<=', id: '_bnd_x_max', name: `${v1.name} <= ${v1.upperBound}` });
  }
  if (v2.upperBound !== null) {
    halfPlanes.push({ a: 0, b: 1, rhs: v2.upperBound, op: '<=', id: '_bnd_y_max', name: `${v2.name} <= ${v2.upperBound}` });
  }

  model.constraints.forEach((c) => {
    const a = c.terms[v1.id] ?? 0;
    const b = c.terms[v2.id] ?? 0;
    if (Math.abs(a) > EPSILON || Math.abs(b) > EPSILON) {
      halfPlanes.push({
        a,
        b,
        rhs: c.rhs,
        op: c.operator,
        id: c.id,
        name: c.name,
      });
    }
  });

  // Calculate approximate bounding box from intersections or optimal point
  let optX = 0;
  let optY = 0;
  let hasOpt = false;
  if (solution && solution.status === 'Optimal' && solution.columns[v1.id] && solution.columns[v2.id]) {
    optX = solution.columns[v1.id].value;
    optY = solution.columns[v2.id].value;
    hasOpt = true;
  }

  // Find candidate axis intercepts
  let maxCandidateX = Math.max(10, optX * 1.5, xMin + 5);
  let maxCandidateY = Math.max(10, optY * 1.5, yMin + 5);

  model.constraints.forEach((c) => {
    const a = c.terms[v1.id] ?? 0;
    const b = c.terms[v2.id] ?? 0;
    if (Math.abs(a) > EPSILON && c.rhs / a > 0) {
      maxCandidateX = Math.max(maxCandidateX, (c.rhs / a) * 1.25);
    }
    if (Math.abs(b) > EPSILON && c.rhs / b > 0) {
      maxCandidateY = Math.max(maxCandidateY, (c.rhs / b) * 1.25);
    }
  });

  const boundMaxX = Math.min(1000, Math.max(10, Math.ceil(maxCandidateX / 5) * 5));
  const boundMaxY = Math.min(1000, Math.max(10, Math.ceil(maxCandidateY / 5) * 5));

  // Add outer bounding box to ensure polygon is bounded
  const allPlanes: HalfPlane[] = [
    ...halfPlanes,
    { a: 1, b: 0, rhs: boundMaxX, op: '<=', id: '_box_x', name: 'Boundary X' },
    { a: 0, b: 1, rhs: boundMaxY, op: '<=', id: '_box_y', name: 'Boundary Y' },
  ];

  // Helper: check if a point (x, y) satisfies all constraints
  const satisfies = (pt: Point2D): boolean => {
    for (const hp of halfPlanes) {
      const val = hp.a * pt.x + hp.b * pt.y;
      if (hp.op === '<=' && val > hp.rhs + EPSILON) return false;
      if (hp.op === '>=' && val < hp.rhs - EPSILON) return false;
      if (hp.op === '=' && Math.abs(val - hp.rhs) > EPSILON * 5) return false;
    }
    // Also within bounding box
    if (pt.x < xMin - EPSILON || pt.x > boundMaxX + EPSILON) return false;
    if (pt.y < yMin - EPSILON || pt.y > boundMaxY + EPSILON) return false;
    return true;
  };

  // Find all pairwise line intersections
  const candidatePoints: Point2D[] = [];
  for (let i = 0; i < allPlanes.length; i++) {
    for (let j = i + 1; j < allPlanes.length; j++) {
      const p1 = allPlanes[i];
      const p2 = allPlanes[j];
      const det = p1.a * p2.b - p1.b * p2.a;
      if (Math.abs(det) > EPSILON) {
        const x = (p1.rhs * p2.b - p1.b * p2.rhs) / det;
        const y = (p1.a * p2.rhs - p1.rhs * p2.a) / det;
        if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
          const pt: Point2D = { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
          if (satisfies(pt)) {
            candidatePoints.push(pt);
          }
        }
      }
    }
  }

  // Deduplicate points
  const uniqueVertices: Point2D[] = [];
  candidatePoints.forEach((pt) => {
    const exists = uniqueVertices.some((v) => Math.hypot(v.x - pt.x, v.y - pt.y) < 1e-3);
    if (!exists) uniqueVertices.push(pt);
  });

  // Sort vertices in clockwise order around centroid
  let sortedPolygon: Point2D[] = [];
  if (uniqueVertices.length >= 3) {
    const cx = uniqueVertices.reduce((sum, p) => sum + p.x, 0) / uniqueVertices.length;
    const cy = uniqueVertices.reduce((sum, p) => sum + p.y, 0) / uniqueVertices.length;
    sortedPolygon = [...uniqueVertices].sort((p1, p2) => {
      const a1 = Math.atan2(p1.y - cy, p1.x - cx);
      const a2 = Math.atan2(p2.y - cy, p2.x - cx);
      return a1 - a2;
    });
  } else if (uniqueVertices.length > 0) {
    sortedPolygon = uniqueVertices;
  }

  // Pre-calculate line endpoints for drawing constraint lines across the canvas
  const colors = ['#2563EB', '#059669', '#D97706', '#9333EA', '#DC2626', '#0891B2', '#4B5563'];
  const constraintLines = model.constraints.map((c, idx) => {
    const a = c.terms[v1.id] ?? 0;
    const b = c.terms[v2.id] ?? 0;
    const color = colors[idx % colors.length];

    // Intersect line a*x + b*y = rhs with the bounding box [0, boundMaxX] x [0, boundMaxY]
    const linePts: Point2D[] = [];
    if (Math.abs(b) > EPSILON) {
      // x = 0 -> y = rhs / b
      const y0 = c.rhs / b;
      if (y0 >= -10 && y0 <= boundMaxY * 1.5) linePts.push({ x: 0, y: y0 });

      // x = boundMaxX -> y = (rhs - a * boundMaxX) / b
      const y1 = (c.rhs - a * boundMaxX) / b;
      if (y1 >= -10 && y1 <= boundMaxY * 1.5) linePts.push({ x: boundMaxX, y: y1 });
    }

    if (Math.abs(a) > EPSILON) {
      // y = 0 -> x = rhs / a
      const x0 = c.rhs / a;
      if (x0 >= -10 && x0 <= boundMaxX * 1.5) linePts.push({ x: x0, y: 0 });

      // y = boundMaxY -> x = (rhs - b * boundMaxY) / a
      const x1 = (c.rhs - b * boundMaxY) / a;
      if (x1 >= -10 && x1 <= boundMaxX * 1.5) linePts.push({ x: x1, y: boundMaxY });
    }

    // Default fallback if no boundary hit
    const p1 = linePts[0] || { x: 0, y: 0 };
    const p2 = linePts[1] || { x: boundMaxX, y: boundMaxY };

    return {
      id: c.id,
      name: c.name,
      operator: c.operator,
      rhs: c.rhs,
      a,
      b,
      color,
      points: [p1, p2] as [Point2D, Point2D],
    };
  });

  return {
    polygonVertices: sortedPolygon,
    constraintLines,
    xRange: [0, boundMaxX],
    yRange: [0, boundMaxY],
    optimalPoint: hasOpt ? { x: optX, y: optY } : null,
    optimalZ: solution?.status === 'Optimal' ? solution.objectiveValue : null,
    objCoeffs: { c1, c2, isMin },
  };
}

/**
 * Clips the objective line c1 * x + c2 * y = Z within a rectangle [0, maxX] x [0, maxY].
 */
export function getObjectiveLineEndpoints(
  c1: number,
  c2: number,
  z: number,
  maxX: number,
  maxY: number
): [Point2D, Point2D] | null {
  if (Math.abs(c1) < EPSILON && Math.abs(c2) < EPSILON) return null;

  const pts: Point2D[] = [];

  // Left edge (x = 0): c2 * y = z -> y = z / c2
  if (Math.abs(c2) > EPSILON) {
    const y = z / c2;
    if (y >= -0.01 && y <= maxY + 0.01) {
      pts.push({ x: 0, y: Math.max(0, Math.min(maxY, y)) });
    }
  }

  // Right edge (x = maxX): c1 * maxX + c2 * y = z -> y = (z - c1 * maxX) / c2
  if (Math.abs(c2) > EPSILON) {
    const y = (z - c1 * maxX) / c2;
    if (y >= -0.01 && y <= maxY + 0.01) {
      pts.push({ x: maxX, y: Math.max(0, Math.min(maxY, y)) });
    }
  }

  // Bottom edge (y = 0): c1 * x = z -> x = z / c1
  if (Math.abs(c1) > EPSILON) {
    const x = z / c1;
    if (x >= -0.01 && x <= maxX + 0.01) {
      pts.push({ x: Math.max(0, Math.min(maxX, x)), y: 0 });
    }
  }

  // Top edge (y = maxY): c1 * x + c2 * maxY = z -> x = (z - c2 * maxY) / c1
  if (Math.abs(c1) > EPSILON) {
    const x = (z - c2 * maxY) / c1;
    if (x >= -0.01 && x <= maxX + 0.01) {
      pts.push({ x: Math.max(0, Math.min(maxX, x)), y: maxY });
    }
  }

  // Remove duplicate close points
  const unique: Point2D[] = [];
  pts.forEach((p) => {
    if (!unique.some((u) => Math.hypot(u.x - p.x, u.y - p.y) < 1e-2)) {
      unique.push(p);
    }
  });

  if (unique.length < 2) return null;
  return [unique[0], unique[1]];
}
