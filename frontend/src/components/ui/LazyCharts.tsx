import React, { lazy, Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load Recharts components
const LazyBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const LazyLineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const LazyPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));

// Re-export non-lazy components that are lightweight
export {
    Bar,
    Line,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Wrapper components with Suspense
const ChartSkeleton: React.FC<{ height?: number | string }> = ({ height = 300 }) => (
    <div
        className="animate-pulse bg-surface-container-high/50 rounded-xl flex items-center justify-center"
        style={{ height }}
    >
        <LoadingSpinner size="md" />
    </div>
);

export const LazyBarChartWrapper: React.FC<any> = (props) => (
    <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyBarChart {...props} />
    </Suspense>
);

export const LazyLineChartWrapper: React.FC<any> = (props) => (
    <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyLineChart {...props} />
    </Suspense>
);

export const LazyPieChartWrapper: React.FC<any> = (props) => (
    <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyPieChart {...props} />
    </Suspense>
);
