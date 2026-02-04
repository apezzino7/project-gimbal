// =============================================================================
// Dashboard Components - Central Export
// =============================================================================
// These components are used to build analytics dashboards with Recharts.

// MetricCard - KPI display with trend indicator
export { MetricCard } from './MetricCard';
export type { MetricCardProps, TrendDirection } from './MetricCard';

// LineChart - Time series visualization
export { LineChart } from './LineChart';
export type { LineChartProps, LineChartDataPoint, LineChartSeries } from './LineChart';

// BarChart - Comparison visualization
export { BarChart } from './BarChart';
export type { BarChartProps, BarChartDataPoint, BarChartSeries } from './BarChart';

// DonutChart - Distribution visualization
export { DonutChart } from './DonutChart';
export type { DonutChartProps, DonutChartDataPoint } from './DonutChart';

// DataTable - Tabular data with sorting and pagination
export { DataTable } from './DataTable';
export type { DataTableProps, DataTableColumn } from './DataTable';

// DateRangePicker - Date range selection with presets
export { DateRangePicker } from './DateRangePicker';
export type { DateRangePickerProps, DateRange, DateRangePreset } from './DateRangePicker';
