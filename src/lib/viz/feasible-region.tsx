import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LPModel, SolveResult } from '../solver/types';
import { compute2DFeasibleRegion, getObjectiveLineEndpoints, Point2D } from './d3-helpers';
import { exportSVGToPNG } from '../export/image';
import { useI18n } from '../i18n';
import { Play, Download, Compass, Sparkles, Sliders, Info } from 'lucide-react';

interface FeasibleRegionProps {
  model: LPModel;
  solution?: SolveResult | null;
  isSolving?: boolean;
}

export const FeasibleRegion: React.FC<FeasibleRegionProps> = ({ model, solution, isSolving }) => {
  const { t, formatNumber } = useI18n();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ pt: Point2D; zVal: number } | null>(null);

  const regionData = useMemo(() => {
    return compute2DFeasibleRegion(model, solution);
  }, [model, solution]);

  const optimalZ = regionData?.optimalZ ?? 0;
  const maxZRange = Math.max(10, Math.abs(optimalZ) * 1.5);
  const minZRange = Math.min(0, optimalZ < 0 ? optimalZ * 1.5 : 0);

  const [currentZ, setCurrentZ] = useState<number>(optimalZ);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Sync currentZ with optimalZ when solve finishes
  useEffect(() => {
    if (solution?.status === 'Optimal' && regionData?.optimalZ !== null && regionData?.optimalZ !== undefined) {
      triggerAnimation(regionData.optimalZ);
    }
  }, [solution]);

  const triggerAnimation = (targetZ: number) => {
    setIsAnimating(true);
    const startZ = 0;
    const duration = 1200; // 1.2s
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrentZ(startZ + (targetZ - startZ) * eased);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setCurrentZ(targetZ);
        setIsAnimating(false);
      }
    };
    requestAnimationFrame(frame);
  };

  if (!regionData || model.variables.length < 2) {
    return (
      <div className="m3-card p-8 flex flex-col items-center justify-center text-center gap-3 bg-white border border-slate-200/90 shadow-sm min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Compass className="w-6 h-6" />
        </div>
        <div className="max-w-sm">
          <h4 className="font-bold text-slate-900 text-sm">Visualización 2D en Espera</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Agrega al menos 2 variables de decisión y 1 restricción para generar el plano cartesiano interactivo de la región factible.
          </p>
        </div>
      </div>
    );
  }

  // SVG Canvas dimensions & scaling
  const width = 660;
  const height = 450;
  const margin = { top: 35, right: 35, bottom: 55, left: 65 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const [minX, maxX] = regionData.xRange;
  const [minY, maxY] = regionData.yRange;

  const scaleX = (x: number) => margin.left + ((x - minX) / (maxX - minX)) * innerWidth;
  const scaleY = (y: number) => margin.top + innerHeight - ((y - minY) / (maxY - minY)) * innerHeight;

  // Compute polygon points SVG string
  const polygonPointsStr = regionData.polygonVertices
    .map((pt) => `${scaleX(pt.x)},${scaleY(pt.y)}`)
    .join(' ');

  // Compute objective line endpoints
  const objEndpoints = getObjectiveLineEndpoints(
    regionData.objCoeffs.c1,
    regionData.objCoeffs.c2,
    currentZ,
    maxX,
    maxY
  );

  // Intermediate contour level sets (e.g. 25%, 50%, 75% of optimal Z)
  const contourLevels = [0.33 * optimalZ, 0.66 * optimalZ].map((zVal) => ({
    zVal,
    endpoints: getObjectiveLineEndpoints(
      regionData.objCoeffs.c1,
      regionData.objCoeffs.c2,
      zVal,
      maxX,
      maxY
    ),
  }));

  const v1Name = model.variables[0]?.name || 'x1';
  const v2Name = model.variables[1]?.name || 'x2';

  // Grid tick marks
  const xTicks = 6;
  const yTicks = 6;
  const xStep = (maxX - minX) / xTicks;
  const yStep = (maxY - minY) / yTicks;

  const handleExportPNG = async () => {
    if (svgRef.current) {
      await exportSVGToPNG(svgRef.current, `region-factible-${model.name.replace(/\s+/g, '_')}.png`);
    }
  };

  return (
    <div id="feasible-region-card" className="m3-card p-5 flex flex-col gap-4 bg-white border border-slate-200/90 shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-2xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              {t('viz.title2D')}
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {v1Name} × {v2Name}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Plano de soluciones factibles con curvas de nivel iso-beneficio y vértices extremos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="animate-objective-button"
            onClick={() => triggerAnimation(optimalZ)}
            disabled={isAnimating || !solution || solution.status !== 'Optimal'}
            className="m3-gradient-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
            title={t('viz.animate')}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isAnimating ? 'Animando...' : t('viz.animate')}</span>
          </button>

          <button
            id="export-png-button"
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            title={t('viz.exportPng')}
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>{t('viz.exportPng')}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-x-auto flex justify-center bg-gradient-to-b from-slate-50/70 to-slate-100/40 rounded-2xl border border-slate-200/80 p-3 shadow-inner">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[660px] h-auto select-none"
          id="lp-feasible-svg"
        >
          <defs>
            {/* Feasible Region Gradient */}
            <linearGradient id="feasibleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
              <stop offset="50%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.4} />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Arrowhead markers */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
            </marker>
          </defs>

          {/* Subtle Grid Lines */}
          <g className="grid-lines" opacity={0.35}>
            {Array.from({ length: xTicks + 1 }).map((_, i) => {
              const val = minX + i * xStep;
              const px = scaleX(val);
              return (
                <line
                  key={`x-grid-${i}`}
                  x1={px}
                  y1={margin.top}
                  x2={px}
                  y2={margin.top + innerHeight}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}
            {Array.from({ length: yTicks + 1 }).map((_, i) => {
              const val = minY + i * yStep;
              const py = scaleY(val);
              return (
                <line
                  key={`y-grid-${i}`}
                  x1={margin.left}
                  y1={py}
                  x2={margin.left + innerWidth}
                  y2={py}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}
          </g>

          {/* Feasible Region Shaded Gradient Polygon */}
          {regionData.polygonVertices.length >= 3 && (
            <polygon
              points={polygonPointsStr}
              fill="url(#feasibleGrad)"
              stroke="#4f46e5"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Static Iso-Level Sets */}
          {optimalZ > 0 &&
            contourLevels.map((lvl, idx) => {
              if (!lvl.endpoints) return null;
              return (
                <g key={`contour-${idx}`} opacity={0.45}>
                  <line
                    x1={scaleX(lvl.endpoints[0].x)}
                    y1={scaleY(lvl.endpoints[0].y)}
                    x2={scaleX(lvl.endpoints[1].x)}
                    y2={scaleY(lvl.endpoints[1].y)}
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={scaleX(lvl.endpoints[1].x) - 10}
                    y={scaleY(lvl.endpoints[1].y) - 6}
                    fill="#D97706"
                    fontSize="9"
                    fontFamily="Fira Code, monospace"
                  >
                    Z={formatNumber(lvl.zVal)}
                  </text>
                </g>
              );
            })}

          {/* Constraint Boundary Lines */}
          {regionData.constraintLines.map((line) => {
            const x1 = scaleX(line.points[0].x);
            const y1 = scaleY(line.points[0].y);
            const x2 = scaleX(line.points[1].x);
            const y2 = scaleY(line.points[1].y);

            return (
              <g key={`constraint-line-${line.id}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={line.color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <text
                  x={(x1 + x2) / 2 + 6}
                  y={(y1 + y2) / 2 - 8}
                  fill={line.color}
                  fontSize="10.5"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="700"
                >
                  {line.name} ({line.operator} {line.rhs})
                </text>
              </g>
            );
          })}

          {/* Animated Main Objective Contour Line */}
          {objEndpoints && (
            <g id="objective-contour-group">
              <line
                x1={scaleX(objEndpoints[0].x)}
                y1={scaleY(objEndpoints[0].y)}
                x2={scaleX(objEndpoints[1].x)}
                y2={scaleY(objEndpoints[1].y)}
                stroke="#EAB308"
                strokeWidth="3.5"
                strokeDasharray="6 3"
                strokeLinecap="round"
                filter="url(#glow)"
              />
              <circle
                cx={(scaleX(objEndpoints[0].x) + scaleX(objEndpoints[1].x)) / 2}
                cy={(scaleY(objEndpoints[0].y) + scaleY(objEndpoints[1].y)) / 2}
                r="5"
                fill="#CA8A04"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Corner Vertices (Interactive hover points) */}
          {regionData.polygonVertices.map((pt, idx) => {
            const zVal =
              (model.objective.terms[model.variables[0].id] ?? 0) * pt.x +
              (model.objective.terms[model.variables[1].id] ?? 0) * pt.y;
            const isOpt =
              regionData.optimalPoint &&
              Math.abs(regionData.optimalPoint.x - pt.x) < 1e-3 &&
              Math.abs(regionData.optimalPoint.y - pt.y) < 1e-3;

            return (
              <g
                key={`vertex-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ pt, zVal })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={scaleX(pt.x)}
                  cy={scaleY(pt.y)}
                  r={isOpt ? 8 : 5}
                  fill={isOpt ? '#10B981' : '#4F46E5'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="hover:scale-125 transition-transform"
                />
              </g>
            );
          })}

          {/* Optimal Vertex Pulsating Halo */}
          {regionData.optimalPoint && (
            <g id="optimal-point-marker">
              <circle
                cx={scaleX(regionData.optimalPoint.x)}
                cy={scaleY(regionData.optimalPoint.y)}
                r="14"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                opacity="0.6"
              >
                <animate
                  attributeName="r"
                  values="8;20;8"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0;0.8"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <text
                x={scaleX(regionData.optimalPoint.x) + 12}
                y={scaleY(regionData.optimalPoint.y) - 10}
                fill="#065F46"
                fontSize="12"
                fontFamily="Fira Code, monospace"
                fontWeight="700"
              >
                Opt ({formatNumber(regionData.optimalPoint.x)}, {formatNumber(regionData.optimalPoint.y)})
              </text>
            </g>
          )}

          {/* Axes */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth + 10}
            y2={margin.top + innerHeight}
            stroke="#334155"
            strokeWidth="2.2"
            markerEnd="url(#arrow)"
          />
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left}
            y2={margin.top - 12}
            stroke="#334155"
            strokeWidth="2.2"
            markerEnd="url(#arrow)"
          />

          {/* Axis Labels */}
          <text
            x={margin.left + innerWidth}
            y={margin.top + innerHeight + 36}
            textAnchor="end"
            fontSize="12"
            fontFamily="Outfit, sans-serif"
            fontWeight="700"
            fill="#1E293B"
          >
            {v1Name} (Eje X)
          </text>
          <text
            x={margin.left - 15}
            y={margin.top - 14}
            textAnchor="start"
            fontSize="12"
            fontFamily="Outfit, sans-serif"
            fontWeight="700"
            fill="#1E293B"
          >
            {v2Name} (Eje Y)
          </text>

          {/* X Ticks */}
          {Array.from({ length: xTicks + 1 }).map((_, i) => {
            const val = minX + i * xStep;
            const px = scaleX(val);
            return (
              <text
                key={`x-label-${i}`}
                x={px}
                y={margin.top + innerHeight + 18}
                textAnchor="middle"
                fontSize="10"
                fontFamily="Fira Code, monospace"
                fill="#64748B"
              >
                {Math.round(val)}
              </text>
            );
          })}

          {/* Y Ticks */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = minY + i * yStep;
            const py = scaleY(val);
            return (
              <text
                key={`y-label-${i}`}
                x={margin.left - 10}
                y={py + 3}
                textAnchor="end"
                fontSize="10"
                fontFamily="Fira Code, monospace"
                fill="#64748B"
              >
                {Math.round(val)}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip for Hovered Corner Vertex */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-mono shadow-xl border border-slate-700 pointer-events-none animate-in fade-in duration-100">
            <span className="font-bold text-amber-400 block font-sans text-[11px]">
              Vértice Extremo:
            </span>
            <span>
              ({v1Name}, {v2Name}) = ({formatNumber(hoveredPoint.pt.x)}, {formatNumber(hoveredPoint.pt.y)})
            </span>
            <span className="block text-emerald-400 mt-0.5">
              Z = {formatNumber(hoveredPoint.zVal)}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Objective Slider */}
      <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-700">{t('viz.dragObjective')}</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-500 text-xs">{t('viz.objectiveLevel')}:</span>
            <span className="font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200 text-xs">
              Z = {formatNumber(currentZ)}
            </span>
          </div>
        </div>

        <input
          id="objective-z-slider"
          type="range"
          min={minZRange}
          max={maxZRange}
          step={Math.max(0.01, (maxZRange - minZRange) / 300)}
          value={currentZ}
          onChange={(e) => setCurrentZ(parseFloat(e.target.value))}
          className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Min: {formatNumber(minZRange)}</span>
          {solution?.status === 'Optimal' && (
            <button
              onClick={() => setCurrentZ(optimalZ)}
              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Fijar en Óptimo (Z* = {formatNumber(optimalZ)})
            </button>
          )}
          <span>Max: {formatNumber(maxZRange)}</span>
        </div>
      </div>
    </div>
  );
};
