import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader } from '../common/Card';

// =============================================================================
// Types
// =============================================================================

export interface BarChartDataPoint {
  /** X-axis label (e.g., category name) */
  name: string;
  /** Data values - keys should match series config */
  [key: string]: string | number;
}

export interface BarChartSeries {
  /** Data key matching the data point keys */
  dataKey: string;
  /** Display name */
  name: string;
  /** Bar color */
  color: string;
  /** Stack ID for stacked bars */
  stackId?: string;
}

export interface BarChartProps {
  /** Chart title */
  title?: string;
  /** Chart data */
  data: BarChartDataPoint[];
  /** Bar series configuration */
  series: BarChartSeries[];
  /** Chart height */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Horizontal layout */
  horizontal?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Styles
// =============================================================================

const CHART_COLORS = {
  grid: '#e0e0e0',
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
 * Bar chart component using Recharts.
 *
 * @example
 * const data = [
 *   { name: 'SMS', sent: 4000, delivered: 3800 },
 *   { name: 'Email', sent: 3000, delivered: 2900 },
 * ];
 *
 * <BarChart
 *   title="Campaign Performance"
 *   data={data}
 *   series={[
 *     { dataKey: 'sent', name: 'Sent', color: '#0353a4' },
 *     { dataKey: 'delivered', name: 'Delivered', color: '#2e7d32' },
 *   ]}
 * />
 *
 * @example
 * // Stacked bar chart
 * <BarChart
 *   title="Revenue by Channel"
 *   data={data}
 *   series={[
 *     { dataKey: 'organic', name: 'Organic', color: '#0353a4', stackId: 'revenue' },
 *     { dataKey: 'paid', name: 'Paid', color: '#006daa', stackId: 'revenue' },
 *   ]}
 * />
 */
export function BarChart({
  title,
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  horizontal = false,
  loading = false,
  className = '',
}: BarChartProps) {
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
      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.grid}
                horizontal={!horizontal}
                vertical={horizontal}
              />
            )}
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fill: CHART_COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: CHART_COLORS.tooltip.bg,
                border: `1px solid ${CHART_COLORS.tooltip.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: CHART_COLORS.text, fontWeight: 600, marginBottom: 4 }}
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span style={{ color: CHART_COLORS.text }}>{value}</span>}
              />
            )}
            {series.map((s) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color}
                stackId={s.stackId}
                radius={s.stackId ? 0 : [4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default BarChart;
