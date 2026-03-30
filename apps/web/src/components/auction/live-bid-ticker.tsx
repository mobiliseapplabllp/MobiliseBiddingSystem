'use client';

import { useEffect, useRef } from 'react';
import { ArrowDown, Zap } from 'lucide-react';
import type { BidPlacedEvent } from '@/hooks/useAuctionSocket';
import { useTranslations } from '@/hooks/useTranslations';
import { formatTime, formatNumber } from '@/lib/format';

interface LiveBidTickerProps {
  bids: BidPlacedEvent[];
  currency?: string;
  maxVisible?: number;
}

export function LiveBidTicker({ bids, currency = 'USD', maxVisible = 8 }: LiveBidTickerProps) {
  const t = useTranslations('auction');
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new bid arrives
  useEffect(() => {
    if (containerRef.current && bids.length > 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [bids.length]);

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <Zap className="h-5 w-5 mb-2 opacity-40" />
        <p className="text-sm">{t('ticker.waitingForBids')}</p>
        <p className="text-xs mt-1">{t('ticker.waitingSubtext')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-none">
      {bids.slice(0, maxVisible).map((bid, idx) => {
        const isNewest = idx === 0;
        const time = formatTime(bid.timestamp);

        return (
          <div
            key={bid.bidId}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
              isNewest
                ? 'bg-blue-50 border border-blue-200 animate-[slideIn_0.3s_ease-out]'
                : 'bg-gray-50 border border-gray-100'
            }`}
          >
            {/* Price indicator */}
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              isNewest ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <ArrowDown className={`h-4 w-4 ${isNewest ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>

            {/* Bid info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-mono text-[14px] font-bold ${isNewest ? 'text-blue-700' : 'text-gray-700'}`}>
                  {currency} {formatNumber(bid.bidPrice)}
                </span>
                {bid.rank && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    bid.rank === 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    #{bid.rank}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {time}
                {isNewest && <span className="ms-1.5 text-blue-500 font-semibold">{t('ticker.new')}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
