'use client'

import { useMemo } from 'react'

interface DataPoint {
  value: number
  date: Date
  notes?: string | null
}

interface ProgressChartProps {
  dataPoints: DataPoint[]
  baselineValue?: number | null
  targetValue?: number | null
  unit?: string
  height?: number
}

export function ProgressChart({
  dataPoints,
  baselineValue,
  targetValue,
  unit = '',
  height = 200,
}: ProgressChartProps) {
  const chartData = useMemo(() => {
    if (dataPoints.length === 0) return null

    const sorted = [...dataPoints].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const values = sorted.map((d) => d.value)
    const allValues = [...values]
    if (baselineValue != null) allValues.push(baselineValue)
    if (targetValue != null) allValues.push(targetValue)

    const minVal = Math.min(...allValues)
    const maxVal = Math.max(...allValues)
    const range = maxVal - minVal || 1
    const padding = range * 0.15

    const yMin = minVal - padding
    const yMax = maxVal + padding

    const chartWidth = 400
    const chartHeight = height - 40 // leave room for labels
    const marginLeft = 45
    const marginRight = 15
    const marginTop = 10
    const marginBottom = 30
    const plotWidth = chartWidth - marginLeft - marginRight
    const plotHeight = chartHeight - marginTop - marginBottom

    function xPos(index: number): number {
      if (sorted.length === 1) return marginLeft + plotWidth / 2
      return marginLeft + (index / (sorted.length - 1)) * plotWidth
    }

    function yPos(value: number): number {
      return marginTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight
    }

    const points = sorted.map((d, i) => ({
      x: xPos(i),
      y: yPos(d.value),
      value: d.value,
      date: new Date(d.date),
      notes: d.notes,
    }))

    // Build polyline path
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    // Compute aimline (linear regression from first to target)
    let aimlinePath: string | null = null
    if (targetValue != null && points.length >= 2) {
      const startX = points[0].x
      const startY = points[0].y
      const endX = points[points.length - 1].x
      const endY = yPos(targetValue)
      aimlinePath = `M ${startX} ${startY} L ${endX} ${endY}`
    }

    // Determine trend for coloring
    let trendColor = '#10b981' // emerald
    if (points.length >= 3) {
      const recentSlice = points.slice(-3)
      const firstRecent = recentSlice[0].value
      const lastRecent = recentSlice[recentSlice.length - 1].value
      if (targetValue != null) {
        // Compare trend against aimline
        const expectedProgress = (targetValue - (baselineValue ?? points[0].value)) *
          ((points.length - 1) / Math.max(points.length, 1))
        const actualProgress = lastRecent - (baselineValue ?? points[0].value)
        if (actualProgress < expectedProgress * 0.7) {
          trendColor = '#ef4444' // rose
        } else if (actualProgress < expectedProgress * 0.9) {
          trendColor = '#f59e0b' // amber
        }
      } else {
        if (lastRecent < firstRecent) {
          trendColor = '#f59e0b'
        }
      }
    }

    // Y-axis ticks
    const tickCount = 4
    const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const value = yMin + (i / tickCount) * (yMax - yMin)
      return { value: Math.round(value * 10) / 10, y: yPos(value) }
    })

    return {
      points,
      linePath,
      aimlinePath,
      trendColor,
      yTicks,
      baselineY: baselineValue != null ? yPos(baselineValue) : null,
      targetY: targetValue != null ? yPos(targetValue) : null,
      chartWidth,
      chartHeight: height,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      plotWidth,
      plotHeight,
    }
  }, [dataPoints, baselineValue, targetValue, height])

  if (!chartData || dataPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-stone-50 rounded-lg border border-stone-200 text-sm text-stone-400"
        style={{ height }}
      >
        No data points yet
      </div>
    )
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
        className="w-full"
        style={{ height }}
      >
        {/* Grid lines */}
        {chartData.yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={chartData.marginLeft}
              y1={tick.y}
              x2={chartData.marginLeft + chartData.plotWidth}
              y2={tick.y}
              stroke="#e7e5e4"
              strokeWidth={0.5}
            />
            <text
              x={chartData.marginLeft - 6}
              y={tick.y + 3}
              textAnchor="end"
              className="fill-stone-400"
              fontSize={9}
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* Baseline line */}
        {chartData.baselineY != null && (
          <line
            x1={chartData.marginLeft}
            y1={chartData.baselineY}
            x2={chartData.marginLeft + chartData.plotWidth}
            y2={chartData.baselineY}
            stroke="#a8a29e"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Target / goal line */}
        {chartData.targetY != null && (
          <line
            x1={chartData.marginLeft}
            y1={chartData.targetY}
            x2={chartData.marginLeft + chartData.plotWidth}
            y2={chartData.targetY}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
        )}

        {/* Aimline */}
        {chartData.aimlinePath && (
          <path
            d={chartData.aimlinePath}
            fill="none"
            stroke="#93c5fd"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.6}
          />
        )}

        {/* Data line */}
        <path
          d={chartData.linePath}
          fill="none"
          stroke={chartData.trendColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {chartData.points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill="white"
              stroke={chartData.trendColor}
              strokeWidth={2}
            />
            {/* X-axis date labels (show first, last, and a few in between) */}
            {(i === 0 || i === chartData.points.length - 1 ||
              (chartData.points.length > 4 && i === Math.floor(chartData.points.length / 2))) && (
              <text
                x={point.x}
                y={chartData.chartHeight - 5}
                textAnchor="middle"
                className="fill-stone-400"
                fontSize={8}
              >
                {point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            )}
          </g>
        ))}

        {/* Labels for baseline and target */}
        {chartData.baselineY != null && (
          <text
            x={chartData.marginLeft + chartData.plotWidth + 2}
            y={chartData.baselineY + 3}
            className="fill-stone-400"
            fontSize={8}
          >
            Base
          </text>
        )}
        {chartData.targetY != null && (
          <text
            x={chartData.marginLeft + chartData.plotWidth + 2}
            y={chartData.targetY + 3}
            className="fill-blue-400"
            fontSize={8}
          >
            Goal
          </text>
        )}
      </svg>
      {unit && (
        <p className="text-[10px] text-stone-400 text-center mt-1">
          Unit: {unit}
        </p>
      )}
    </div>
  )
}
