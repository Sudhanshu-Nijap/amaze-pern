import { useState, useMemo } from 'react';

const formatPrice = (val) => {
  if (val === undefined || val === null) return "0";
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').replace(/[^0-9.]/g, '').replace(/\.$/, ''));
  if (isNaN(num)) return "0";
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function PriceChart({ history = [], currentPrice, targetPrice }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Normalize and sort data chronologically
  const chartData = useMemo(() => {
    const points = history
      .map(item => ({
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/,/g, '').replace(/[^0-9.]/g, '')),
        date: new Date(item.timestamp),
        label: new Date(item.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        fullDate: new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      }))
      .filter(item => !isNaN(item.price) && item.price > 0)
      .sort((a, b) => a.date - b.date);

    // If current price is provided and distinct or last point doesn't exist, ensure latest point is included
    const numCurrent = typeof currentPrice === 'number' ? currentPrice : parseFloat(String(currentPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
    if (!isNaN(numCurrent) && numCurrent > 0) {
      if (points.length === 0) {
        points.push({
          price: numCurrent,
          date: new Date(),
          label: 'Today',
          fullDate: 'Current live price'
        });
      }
    }

    return points;
  }, [history, currentPrice]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-4 text-muted small">
        No price history points available yet.
      </div>
    );
  }

  // Dimensions
  const width = 600;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 65 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Min and Max prices for scale
  const prices = chartData.map(d => d.price);
  if (targetPrice && !isNaN(targetPrice) && targetPrice > 0) {
    prices.push(targetPrice);
  }

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const buffer = rawMax === rawMin ? rawMin * 0.1 || 100 : (rawMax - rawMin) * 0.15;
  const minPrice = Math.max(0, rawMin - buffer);
  const maxPrice = rawMax + buffer;

  // Coordinate mapping
  const getX = (index) => {
    if (chartData.length === 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (chartData.length - 1)) * innerWidth;
  };

  const getY = (price) => {
    if (maxPrice === minPrice) return padding.top + innerHeight / 2;
    return padding.top + innerHeight - ((price - minPrice) / (maxPrice - minPrice)) * innerHeight;
  };

  // Build SVG path
  const coordinates = chartData.map((d, i) => ({ x: getX(i), y: getY(d.price), data: d }));
  
  let pathD = '';
  if (coordinates.length === 1) {
    pathD = `M ${padding.left} ${coordinates[0].y} L ${padding.left + innerWidth} ${coordinates[0].y}`;
  } else {
    pathD = coordinates.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      // Smooth curve
      const prev = arr[idx - 1];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      return `${acc} C ${cpX1} ${prev.y}, ${cpX2} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }

  // Closed area under the curve
  const areaD = coordinates.length === 1
    ? ''
    : `${pathD} L ${coordinates[coordinates.length - 1].x} ${padding.top + innerHeight} L ${coordinates[0].x} ${padding.top + innerHeight} Z`;

  // Target line Y
  const numTarget = typeof targetPrice === 'number' ? targetPrice : parseFloat(targetPrice);
  const targetY = (!isNaN(numTarget) && numTarget > 0) ? getY(numTarget) : null;

  return (
    <div className="w-100 position-relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-100 h-auto"
        style={{ overflow: 'visible', maxHeight: '250px' }}
      >
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines and Y-axis labels */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const p = minPrice + (maxPrice - minPrice) * (1 - ratio);
          const y = padding.top + innerHeight * ratio;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
                fontFamily="sans-serif"
              >
                ₹{formatPrice(Math.round(p))}
              </text>
            </g>
          );
        })}

        {/* Target Price dashed line */}
        {targetY !== null && (
          <g>
            <line
              x1={padding.left}
              y1={targetY}
              x2={padding.left + innerWidth}
              y2={targetY}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left + innerWidth}
              y={targetY - 5}
              textAnchor="end"
              fontSize="10"
              fill="#d97706"
              fontWeight="600"
              fontFamily="sans-serif"
            >
              Target: ₹{formatPrice(numTarget)}
            </text>
          </g>
        )}

        {/* Area fill */}
        {areaD && (
          <path d={areaD} fill="url(#priceGradient)" />
        )}

        {/* Main Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {coordinates.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint === i ? "5.5" : "3.5"}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {/* Invisible larger hover area */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="15"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </g>
        ))}

        {/* X-axis date labels */}
        {chartData.map((d, i) => {
          // Show label if reasonable number of points
          if (chartData.length > 6 && i % Math.ceil(chartData.length / 6) !== 0 && i !== chartData.length - 1) {
            return null;
          }
          return (
            <text
              key={i}
              x={getX(i)}
              y={padding.top + innerHeight + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
              fontFamily="sans-serif"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredPoint !== null && coordinates[hoveredPoint] && (
        <div
          className="position-absolute bg-dark text-white rounded-2 px-2 py-1 shadow-sm small pointer-events-none"
          style={{
            left: `${(coordinates[hoveredPoint].x / width) * 100}%`,
            top: `${(coordinates[hoveredPoint].y / height) * 100}%`,
            transform: 'translate(-50%, -125%)',
            zIndex: 10,
            fontSize: '0.75rem',
            whiteSpace: 'nowrap'
          }}
        >
          <div className="fw-bold">₹{formatPrice(coordinates[hoveredPoint].data.price)}</div>
          <div className="text-white-50" style={{ fontSize: '0.65rem' }}>{coordinates[hoveredPoint].data.fullDate}</div>
        </div>
      )}
    </div>
  );
}
