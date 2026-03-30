'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/hooks/useTranslations';

interface CountdownTimerProps {
  endTime: string | Date;
  onExpired?: () => void;
  isExtended?: boolean;
}

function getTimeRemaining(endTime: Date): number {
  return Math.max(0, endTime.getTime() - Date.now());
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export default function CountdownTimer({ endTime, onExpired, isExtended }: CountdownTimerProps) {
  const t = useTranslations('auctionDetail');
  const target = endTime instanceof Date ? endTime : new Date(endTime);
  const [remaining, setRemaining] = useState(() => getTimeRemaining(target));
  const [expired, setExpired] = useState(() => getTimeRemaining(target) === 0);

  useEffect(() => {
    if (expired) return;

    const interval = setInterval(() => {
      const ms = getTimeRemaining(target);
      setRemaining(ms);
      if (ms === 0) {
        setExpired(true);
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [target, expired, onExpired]);

  // Reset when endTime changes (e.g. extension)
  useEffect(() => {
    const ms = getTimeRemaining(target);
    setRemaining(ms);
    if (ms > 0) {
      setExpired(false);
    }
  }, [target]);

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-mono font-bold text-text-disabled tracking-widest">
          00:00:00
        </span>
        <span className="text-sm font-semibold text-error">
          {t('auctionEnded')}
        </span>
      </div>
    );
  }

  const fiveMinutes = 5 * 60 * 1000;
  const twoMinutes = 2 * 60 * 1000;
  const oneMinute = 60 * 1000;

  let colorClass = 'text-text-primary';
  if (remaining < twoMinutes) {
    colorClass = 'text-red-600';
  } else if (remaining < fiveMinutes) {
    colorClass = 'text-amber-600';
  }

  const shouldPulse = remaining < oneMinute;

  return (
    <div className="flex flex-col items-center gap-2" role="timer" aria-live="polite" aria-atomic="true">
      <span
        className={`text-5xl font-mono font-bold tracking-widest tabular-nums ${colorClass} ${shouldPulse ? 'animate-pulse' : ''}`}
      >
        {formatTime(remaining)}
      </span>
      <span className="sr-only">{t('timeRemaining', 'Time remaining')}: {formatTime(remaining)}</span>
      {isExtended && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
          {t('extended')}
        </span>
      )}
    </div>
  );
}
