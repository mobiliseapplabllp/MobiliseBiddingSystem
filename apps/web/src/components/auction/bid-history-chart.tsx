'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useTranslations } from '@/hooks/useTranslations';
import { formatTime, formatNumber } from '@/lib/format';

interface BidDataPoint {
  bidPrice: number;
  placedAt: string;
  supplierId?: string;
  bidNumber?: number;
}

interface BidHistoryChartProps {
  bids: BidDataPoint[];
  currency?: string;
  height?: number;
}

export function BidHistoryChart({ bids, currency = 'USD', height = 280 }: BidHistoryChartProps) {
  const t = useTranslations('auction');
  const chartData = useMemo(() => {
    if (!bids || bids.length === 0) return [];

    return bids
      .slice()
      .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime())
      .map((bid, idx) => ({
        time: formatTime(bid.placedAt),
        price: Number(bid.bidPrice),
        bid: idx + 1,
      }));
  }, [bids]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
        {t('ticker.noBidData')}
      </div>
    );
  }

  const minPrice = Math.min(...chartData.map((d) => d.price));
  const maxPrice = Math.max(...chartData.map((d) => d.price));
  const priceRange = maxPrice - minPrice;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            domain={[Math.floor(minPrice - priceRange * 0.1), Math.ceil(maxPrice + priceRange * 0.1)]}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '8px 12px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${currency} ${formatNumber(value)}`, t('ticker.bidPriceLabel')]}
            labelFormatter={(label) => `${t('ticker.timeLabel')}: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#2563EB"
            strokeWidth={2}
            fill="url(#bidGradient)"
            dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#1D4ED8', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
