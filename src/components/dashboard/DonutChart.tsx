import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardHeader } from '../common/Card';

// =============================================================================
// Types
// =============================================================================

export interface DonutChartDataPoint {
  /** Segment name */
  name: string;
  /** Segment value */
  value: number;
  /** Segment color (optional - will use default palette) */
  color?: string;
}

export interface DonutChartProps {
  /** Chart title */
  title?: string;
  /** Chart data */
  data: DonutChartDataPoint[];
  /** Chart height */
  height?: number;
  /** Inner radius for donut hole (0 = pie chart) */
  innerRadius?: number;
  /** Outer radius */
  outerRadius?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Show labels on segments */
  showLabels?: boolean;
  /** Center label (e.g., total value) */
  centerLabel?: string;
  /** Center sublabel */
  centerSublabel?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Default Colors
// =============================================================================

const DEFAULT_COLORS = [
  '#0353a4', // Primary
  '#006daa', // Secondary
  '#2e7d32', // Success
  '#ed6c02', // Warning
  '#d32f2f', // Danger
  '#003559', // Dark
  '#b9d6f2', // Light
];

const CHART_COLORS = {
  text: '#003559',
  tooltip: {
    bg: '#ffffff',
    border: '#e0e0e0',
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Donut/Pie chart component using Recharts.
 *
 * @example
 * const data = [
 *   { name: 'SMS', value: 400 },
 *   { name: 'Email', value: 300 },
 *   { name: 'Social', value: 200 },
 * ];
 *
 * <DonutChart
 *   title="Campaigns by Type"
 *   data={data}
 *   centerLabel="900"
 *   centerSublabel="Total"
 * />
 *
 * @example
 * // Pie chart (no center hole)
 * <DonutChart data={data} innerRadius={0} />
 */
export function DonutChart({
  title,
  data,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  showLegend = true,
  showLabels = false,
  centerLabel,
  centerSublabel,
  loading = false,
  className = '',
}: DonutChartProps) {
  // Calculate total for percentage labels
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <Card className={className}>
        {title && <CardHeader>{title}</CardHeader>}
        <div className="p-4" style={{ height }}>
          <div className="animate-pulse h-full bg-gray-100 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      {title && <CardHeader>{title}</CardHeader>}
      <div className="p-4 relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={
                showLabels
                  ? ({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  : undefined
              }
              labelLine={showLabels}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: CHART_COLORS.tooltip.bg,
                border: `1px solid ${CHART_COLORS.tooltip.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : 0;
                return [
                  `${numValue.toLocaleString()} (${((numValue / total) * 100).toFixed(1)}%)`,
                  name,
                ];
              }}
            />
            {showLegend && (
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span style={{ color: CHART_COLORS.text }}>{value}</span>}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        {(centerLabel || centerSublabel) && innerRadius > 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ paddingBottom: showLegend ? 40 : 0 }}
          >
            {centerLabel && (
              <span className="text-2xl font-bold text-[#003559]">{centerLabel}</span>
            )}
            {centerSublabel && (
              <span className="text-sm text-gray-500">{centerSublabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default DonutChart;
