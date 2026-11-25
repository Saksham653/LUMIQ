// The chart layer, one entry point:
//   import { BarChart, HBarChart, LineChart, Sparkline, Distribution, Ring, chartScale } from '@/ui/charts';
//
// Only the charts and their types are exported by name. The parts they share
// (the plot and its touch surface, the read-out, the growing bar, the dashed
// rule) stay inside the folder: import them from '@/ui/charts/bar-chart' only
// when building another chart here.
//
// The pure helpers of scale.ts come as one name, chartScale, so that short
// names like `clamp` and `extent` never collide with another group's in the
// library's barrel:
//   const bins = chartScale.binValues(values);

export { BarChart, type BarChartProps, type BarDatum, type ChartPaper, type ChartSize } from './bar-chart';
export { HBarChart, type HBarChartProps, type HBarDatum } from './h-bar-chart';
export { LineChart, type LineChartProps, type LinePoint } from './line-chart';
export { Sparkline, type SparklineProps, type SparklineVariant } from './sparkline';
export { Distribution, type DistributionBin, type DistributionProps } from './distribution';
export { Ring, type RingProps, type RingSize } from './ring';
export * as chartScale from './scale';
