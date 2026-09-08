import { LPModel } from '../solver/types';

/**
 * Pre-loaded example models for LP Studio
 * 1. Product Mix (2 variables, ideal for 2D graphical visualization)
 * 2. Diet Problem (Classic Stigler LP)
 * 3. Factory Production & Overtime (3 variables with sensitivity analysis)
 * 4. Capital Budgeting / Project Selection (Binary 0-1 Knapsack)
 */

export const EXAMPLE_MODELS: LPModel[] = [
  {
    id: 'example-2var-carpentry',
    name: 'Mezcla de Producción (2 Variables - Gráfico 2D)',
    description: 'Problema clásico de optimización de producción de mesas (x1) y sillas (x2) con horas de carpintería y acabado.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction: 'maximize',
      terms: {
        v1: 50, // 50€ ganancia por mesa
        v2: 30, // 30€ ganancia por silla
      },
    },
    variables: [
      {
        id: 'v1',
        name: 'x1',
        type: 'continuous',
        lowerBound: 0,
        upperBound: null,
      },
      {
        id: 'v2',
        name: 'x2',
        type: 'continuous',
        lowerBound: 0,
        upperBound: null,
      },
    ],
    constraints: [
      {
        id: 'c1',
        name: 'Carpintería (horas)',
        terms: { v1: 2, v2: 1 },
        operator: '<=',
        rhs: 100,
      },
      {
        id: 'c2',
        name: 'Pintura y Acabado (horas)',
        terms: { v1: 1, v2: 1 },
        operator: '<=',
        rhs: 80,
      },
      {
        id: 'c3',
        name: 'Capacidad de Almacén',
        terms: { v1: 1, v2: 0 },
        operator: '<=',
        rhs: 40,
      },
    ],
  },
  {
    id: 'example-diet-problem',
    name: 'Problema de la Dieta Saludable (Minimización)',
    description: 'Minimizar el costo diario satisfaciendo requerimientos mínimos de calorías, proteínas y vitamina C.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction: 'minimize',
      terms: {
        v1: 1.8, // Porción de avena (1.80€)
        v2: 2.5, // Pollo (2.50€)
        v3: 0.9, // Naranja (0.90€)
      },
    },
    variables: [
      {
        id: 'v1',
        name: 'Avena',
        type: 'continuous',
        lowerBound: 0,
        upperBound: 10,
      },
      {
        id: 'v2',
        name: 'Pollo',
        type: 'continuous',
        lowerBound: 0,
        upperBound: 8,
      },
      {
        id: 'v3',
        name: 'Naranja',
        type: 'continuous',
        lowerBound: 0,
        upperBound: 12,
      },
    ],
    constraints: [
      {
        id: 'c1',
        name: 'Energía Mínima (kcal)',
        terms: { v1: 300, v2: 200, v3: 70 },
        operator: '>=',
        rhs: 2000,
      },
      {
        id: 'c2',
        name: 'Proteínas Mínimas (g)',
        terms: { v1: 10, v2: 30, v3: 1 },
        operator: '>=',
        rhs: 65,
      },
      {
        id: 'c3',
        name: 'Vitamina C (mg)',
        terms: { v1: 0, v2: 2, v3: 50 },
        operator: '>=',
        rhs: 80,
      },
    ],
  },
  {
    id: 'example-capital-budgeting',
    name: 'Presupuesto de Capital (Variables Binarias 0-1)',
    description: 'Selección óptima de proyectos de inversión con retorno esperado y restricción presupuestaria estricta.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    objective: {
      direction: 'maximize',
      terms: {
        v1: 140, // VAN Proyecto 1
        v2: 170, // VAN Proyecto 2
        v3: 100, // VAN Proyecto 3
        v4: 60,  // VAN Proyecto 4
      },
    },
    variables: [
      { id: 'v1', name: 'Proyecto_Alfa', type: 'binary', lowerBound: 0, upperBound: 1 },
      { id: 'v2', name: 'Proyecto_Beta', type: 'binary', lowerBound: 0, upperBound: 1 },
      { id: 'v3', name: 'Proyecto_Gamma', type: 'binary', lowerBound: 0, upperBound: 1 },
      { id: 'v4', name: 'Proyecto_Delta', type: 'binary', lowerBound: 0, upperBound: 1 },
    ],
    constraints: [
      {
        id: 'c1',
        name: 'Inversión Año 1 (k€)',
        terms: { v1: 50, v2: 70, v3: 40, v4: 20 },
        operator: '<=',
        rhs: 110,
      },
      {
        id: 'c2',
        name: 'Inversión Año 2 (k€)',
        terms: { v1: 30, v2: 40, v3: 30, v4: 15 },
        operator: '<=',
        rhs: 75,
      },
      {
        id: 'c3',
        name: 'Mutuamente Excluyentes (Alfa y Beta)',
        terms: { v1: 1, v2: 1, v3: 0, v4: 0 },
        operator: '<=',
        rhs: 1,
      },
    ],
  },
];

export { EXAMPLE_MODELS as PRELOADED_EXAMPLES };
