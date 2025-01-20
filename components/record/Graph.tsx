import { Card, CardContent, Container } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { getElapsedTimeStr } from '../../lib/format';
import { CurveType } from 'recharts/types/shape/Curve';

export type SeriesDataPoint = {
  x: number;
  y: number;
};

export type Series = {
  id: string;
  data: SeriesDataPoint[];
}[];

// Convert series data to Recharts format
const convertData = (series: Series) => {
  if (!series.length || !series[0].data.length) return [];

  // Create data points for each x value
  return series[0].data.map((point, index) => {
    const dataPoint: any = { x: point.x };
    // Add y values from each series
    series.forEach(s => {
      dataPoint[s.id] = s.data[index]?.y ?? null;
    });
    return dataPoint;
  });
};

export default function Graph({
  series,
  colors,
  curve = 'natural',
  enableArea = false,
  enableLegends = false,
  isInteractive = false
}: {
  series: Series;
  colors: string[];
  curve?: 'linear' | 'step' | 'natural' | 'basis' | 'cardinal' | 'catmullRom' | 'monotoneX' | 'monotoneY' | 'stepAfter' | 'stepBefore';
  enableArea?: boolean;
  enableLegends?: boolean;
  isInteractive?: boolean;
}) {
  const data = convertData(series);

  // Map Nivo curve types to Recharts
  const getCurveType = (curveType: string) : CurveType => {
    const curveMap: { [key: string]: string } = {
      'linear': 'linear',
      'natural': 'monotoneX',
      'step': 'stepAfter',
      'stepAfter': 'stepAfter',
      'stepBefore': 'stepBefore',
      'monotoneX': 'monotoneX',
      'monotoneY': 'monotoneY',
      'basis': 'basis',
      'cardinal': 'cardinal',
      'catmullRom': 'monotoneX'
    };
    return curveMap[curveType] as CurveType || 'monotoneX';
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex items-center mb-4">
          <div className="flex space-x-4">
            {series.map((s, index) => (
              <div
                key={s.id}
                className="flex items-center space-x-2"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors[index] }}
                />
                <span>{s.id}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[25vh] w-full">
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, bottom: 50, left: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                tickFormatter={getElapsedTimeStr}
                angle={-45}
                textAnchor="end"
                interval={Math.floor(data.length / 20)}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(v) => Number(v).toFixed(2)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => Number(v).toFixed(2)}
              />
              {isInteractive && <Tooltip
                formatter={(value: number) => Number(value).toFixed(2)}
                labelFormatter={getElapsedTimeStr}
              />}
              {enableLegends && <Legend
                align="right"
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px' }}
              />}
              {series.map((s, index) => (
                <Line
                  key={s.id}
                  type={getCurveType(curve)}
                  dataKey={s.id}
                  stroke={colors[index]}
                  fill={enableArea ? colors[index] : undefined}
                  dot={false}
                  yAxisId={index === 0 ? "left" : "right"}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}