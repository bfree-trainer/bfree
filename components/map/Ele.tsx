import { useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area
} from 'recharts';
import { CourseData } from '../../lib/gpx_parser';
import haversine from '../../lib/haversine';
export default function Ele({
  course,
  showMarker,
  moveMarker,
}: {
  course?: CourseData;
  showMarker(en: boolean): void;
  moveMarker(pos: [number, number]): void;
}) {
  const dist = useRef(0);
  const data = useMemo(() => {
    dist.current = 0;
    if (!course || !course.tracks || course.tracks.length === 0) {
      return [
        { distance: 0, elevation: 0 },
        { distance: 1, elevation: 0 },
      ];
    }

    return course.tracks.flatMap((track) =>
      track.segments
        .map(({ trackpoints: tp }) => tp)
        .flat(1)
        .map((tp, i, arr) => ({
          distance:
            i === 0
              ? dist.current
              : (dist.current += haversine(
                [arr[i - 1].lat, arr[i - 1].lon],
                [tp.lat, tp.lon]
              )),
          elevation: tp.ele,
          position: [tp.lat, tp.lon] as [number, number],
        }))
    );
  }, [course]);

  const formatValue = (value: number) => `${value.toFixed(2)}m`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const point = payload[0].payload;
      if (point.position) {
        moveMarker(point.position);
        showMarker(true);
      }
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p>{`Distance: ${formatValue(point.distance)}`}</p>
          <p>{`Elevation: ${formatValue(point.elevation)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 50, left: 45 }}
          onMouseLeave={() => showMarker(false)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="distance"
            tickFormatter={formatValue}
            label={{
              value: 'distance',
              position: 'bottom',
              offset: 25
            }}
            angle={45}
            tickMargin={30}
          />
          <YAxis
            dataKey="elevation"
            tickFormatter={formatValue}
            label={{
              value: 'elevation',
              angle: -90,
              position: 'insideLeft',
              offset: -35
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#8884d8"
            fill="url(#elevationGradient)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}