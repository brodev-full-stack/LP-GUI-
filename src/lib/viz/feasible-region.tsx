import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LPModel, SolveResult } from '../solver/types';
import { compute2DFeasibleRegion, getObjectiveLineEndpoints, Point2D } from './d3-helpers';
import { exportSVGToPNG } from '../export/image';
import { useI18n } from '../i18n';
import { Play, Download, Maximize2, Compass } from 'lucide-react';

interface FeasibleRegionProps {
  model: LPModel;
  solution?: SolveResult | null;
  isSolving?: boolean;
}

export const FeasibleRegion: React.FC<FeasibleRegionProps> = ({ model, solution, isSolving }) => {
  const { t, formatNumber } = useI18n();
  const svgRef = useRef<SVGSVGElement | null>(null);

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
      // Trigger smooth entry animation
      triggerAnimation(regionData.optimalZ);
    }
  }, [solution]);

  const triggerAnimation = (targetZ: number) => {
    setIsAnimating(true);
    const startZ = 0;
    const duration = 1000; // 1s
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

  if (!regionData) {
    return null;
  }

  // SVG Canvas dimensions & scaling
  const width = 640;
  const height = 440;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
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

  const v1Name = model.variables[0]?.name || 'x1';
  const v2Name = model.variables[1]?.name || 'x2';

  // Grid tick marks
  const xTicks = 5;
  const yTicks = 5;
  const xStep = (maxX - minX) / xTicks;
  const yStep = (maxY - minY) / yTicks;

  const handleExportPNG = async () => {
    if (svgRef.current) {
      await exportSVGToPNG(svgRef.current, `region-factible-${model.name.replace(/\s+/g, '_')}.png`);
    }
  };

  return (
    <div id="feasible-region-card" className="liquid-card rounded-2xl p-5 border border-white/80 shadow-sm flex flex-col gap-4">
      {/* Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900 tracking-tight text-base">
            {t('viz.title2D')}
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {v1Name} × {v2Name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="animate-objective-button"
            onClick={() => triggerAnimation(optimalZ)}
            disabled={isAnimating || !solution || solution.status !== 'Optimal'}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-xs disabled:opacity-40"
            title={t('viz.animate')}
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('viz.animate')}</span>
          </button>

          <button
            id="export-png-button"
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-xs"
            title={t('viz.exportPng')}
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>{t('viz.exportPng')}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="w-full overflow-x-auto flex justify-center bg-white/50 rounded-xl border border-slate-200/50 p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[640px] h-auto select-none"
          id="lp-feasible-svg"
        >
          {/* Subtle Background Grid lines */}
          <g className="grid-lines" opacity={0.4}>
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
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeDasharray="2 2"
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
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              );
            })}
          </g>

          {/* Feasible Region Shaded Polygon */}
          {regionData.polygonVertices.length >= 3 && (
            <polygon
              points={polygonPointsStr}
              fill="#3B82F6"
              fillOpacity={0.22}
              stroke="#2563EB"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {/* Constraint Lines */}
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
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Constraint label */}
                <text
                  x={(x1 + x2) / 2 + 6}
                  y={(y1 + y2) / 2 - 6}
                  fill={line.color}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                >
                  {line.name} ({line.operator} {line.rhs})
                </text>
              </g>
            );
          })}

          {/* Interactive Objective Contour Line */}
          {objEndpoints && (
            <g id="objective-contour-group">
              <line
                x1={scaleX(objEndpoints[0].x)}
                y1={scaleY(objEndpoints[0].y)}
                x2={scaleX(objEndpoints[1].x)}
                y2={scaleY(objEndpoints[1].y)}
                stroke="#EAB308"
                strokeWidth="3.2"
                strokeDasharray="4 3"
                strokeLinecap="round"
              />
              <circle
                cx={(scaleX(objEndpoints[0].x) + scaleX(objEndpoints[1].x)) / 2}
                cy={(scaleY(objEndpoints[0].y) + scaleY(objEndpoints[1].y)) / 2}
                r="4"
                fill="#CA8A04"
              />
            </g>
          )}

          {/* Optimal Vertex Dot */}
          {regionData.optimalPoint && (
            <g id="optimal-point-marker">
              <circle
                cx={scaleX(regionData.optimalPoint.x)}
                cy={scaleY(regionData.optimalPoint.y)}
                r="7"
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                className="animate-pulse"
              />
              <circle
                cx={scaleX(regionData.optimalPoint.x)}
                cy={scaleY(regionData.optimalPoint.y)}
                r="12"
                fill="none"
                stroke="#EF4444"
                strokeWidth="1.5"
                opacity="0.5"
              />
              <text
                x={scaleX(regionData.optimalPoint.x) + 10}
                y={scaleY(regionData.optimalPoint.y) - 10}
                fill="#991B1B"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                Opt ({formatNumber(regionData.optimalPoint.x)}, {formatNumber(regionData.optimalPoint.y)})
              </text>
            </g>
          )}

          {/* X & Y Coordinate Axes */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth + 10}
            y2={margin.top + innerHeight}
            stroke="#475569"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left}
            y2={margin.top - 10}
            stroke="#475569"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          {/* Axis Labels */}
          <text
            x={margin.left + innerWidth}
            y={margin.top + innerHeight + 35}
            textAnchor="end"
            fontSize="12"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            fill="#334155"
          >
            {v1Name} (Eje X)
          </text>
          <text
            x={margin.left - 15}
            y={margin.top - 12}
            textAnchor="start"
            fontSize="12"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            fill="#334155"
          >
            {v2Name} (Eje Y)
          </text>

          {/* X Tick Labels */}
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
                fontFamily="JetBrains Mono, monospace"
                fill="#64748B"
              >
                {Math.round(val)}
              </text>
            );
          })}

          {/* Y Tick Labels */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = minY + i * yStep;
            const py = scaleY(val);
            return (
              <text
                key={`y-label-${i}`}
                x={margin.left - 8}
                y={py + 3}
                textAnchor="end"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fill="#64748B"
              >
                {Math.round(val)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Interactive Objective Slider */}
      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">{t('viz.dragObjective')}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-xs">{t('viz.objectiveLevel')}:</span>
            <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Z = {formatNumber(currentZ)}
            </span>
          </div>
        </div>

        <input
          id="objective-z-slider"
          type="range"
          min={minZRange}
          max={maxZRange}
          step={Math.max(0.1, (maxZRange - minZRange) / 200)}
          value={currentZ}
          onChange={(e) => setCurrentZ(parseFloat(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>Min: {formatNumber(minZRange)}</span>
          {solution?.status === 'Optimal' && (
            <button
              onClick={() => setCurrentZ(optimalZ)}
              className="text-blue-600 font-medium hover:underline cursor-pointer"
            >
              Fijar en Óptimo (Z = {formatNumber(optimalZ)})
            </button>
          )}
          <span>Max: {formatNumber(maxZRange)}</span>
        </div>
      </div>
    </div>
  );
};
