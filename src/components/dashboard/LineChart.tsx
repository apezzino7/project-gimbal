import {
  LineChart as RechartsLineChart,
  Line,
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

export interface LineChartDataPoint {
  /** X-axis label (e.g., date, category) */
  name: string;
  /** Data values - keys should match series config */
  [key: string]: string | number;
}

export interface LineChartSeries {
  /** Data key matching the data point keys */
  dataKey: string;
  /** Display name */
  name: string;
  /** Line color */
  color: string;
  /** Show dots on line */
  showDots?: boolean;
  /** Dashed line style */
  dashed?: boolean;
}

export interface LineChartProps {
  /** Chart title */
  title?: string;
  /** Chart data */
  data: LineChartDataPoint[];
  /** Line series configuration */
  series: LineChartSeries[];
  /** Chart height */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
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
 * Line chart component using Recharts.
 *
 * @example
 * const data = [
 *   { name: 'Jan', revenue: 4000, orders: 240 },
 *   { name: 'Feb', revenue: 3000, orders: 139 },
 *   { name: 'Mar', revenue: 2000, orders: 980 },
 * ];
 *
 * <LineChart
 *   title="Revenue Over Time"
 *   data={data}
 *   series={[
 *     { dataKey: 'revenue', name: 'Revenue', color: '#0353a4' },
 *     { dataKey: 'orders', name: 'Orders', color: '#2e7d32' },
 *   ]}
 * />
 */
export function LineChart({
  title,
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  loading = false,
  className = '',
}: LineChartProps) {
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
          <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            )}
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
            <Tooltip
              contentStyle={{
                backgroundColor: CHART_COLORS.tooltip.bg,
                border: `1px solid ${CHART_COLORS.tooltip.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: CHART_COLORS.text, fontWeight: 600, marginBottom: 4 }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span style={{ color: CHART_COLORS.text }}>{value}</span>}
              />
            )}
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 5' : undefined}
                dot={s.showDots !== false ? { fill: s.color, strokeWidth: 2, r: 4 } : false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default LineChart;
