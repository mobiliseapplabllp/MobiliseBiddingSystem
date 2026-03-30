'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

const TOUR_PREFIX = 'esourcing_tour_complete_';

export function useTour(tourId: string) {
  const [completed, setCompleted] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(TOUR_PREFIX + tourId) === '1';
  });

  const markCompleted = useCallback(() => {
    localStorage.setItem(TOUR_PREFIX + tourId, '1');
    setCompleted(true);
  }, [tourId]);

  const reset = useCallback(() => {
    localStorage.removeItem(TOUR_PREFIX + tourId);
    setCompleted(false);
  }, [tourId]);

  return { completed, markCompleted, reset };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GuidedTour({ tourId, steps, onComplete, onSkip }: GuidedTourProps) {
  const t = useTranslations('guidedTour');
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { markCompleted } = useTour(tourId);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  // Find and highlight the target element
  useEffect(() => {
    if (!current) return;
    const el = document.querySelector(current.target) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to finish
      const timer = setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // Element not found — skip to next step
      if (!isLast) setStep((s) => s + 1);
      else handleFinish();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, current?.target]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (!current) return;
      const el = document.querySelector(current.target) as HTMLElement;
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [current]);

  const handleFinish = () => {
    markCompleted();
    onComplete?.();
  };

  const handleSkip = () => {
    markCompleted();
    onSkip?.();
  };

  if (!current || !targetRect) return null;

  // Calculate tooltip position
  const pos = current.position ?? 'bottom';
  const pad = 12;
  let tooltipStyle: React.CSSProperties = { position: 'fixed', zIndex: 100000 };

  if (pos === 'bottom') {
    tooltipStyle.top = targetRect.bottom + pad;
    tooltipStyle.left = Math.max(16, targetRect.left + targetRect.width / 2 - 160);
  } else if (pos === 'top') {
    tooltipStyle.bottom = window.innerHeight - targetRect.top + pad;
    tooltipStyle.left = Math.max(16, targetRect.left + targetRect.width / 2 - 160);
  } else if (pos === 'right') {
    tooltipStyle.top = targetRect.top + targetRect.height / 2 - 60;
    tooltipStyle.left = targetRect.right + pad;
  } else {
    tooltipStyle.top = targetRect.top + targetRect.height / 2 - 60;
    tooltipStyle.right = window.innerWidth - targetRect.left + pad;
  }

  return (
    <>
      {/* Spotlight overlay */}
      <div
        className="fixed inset-0 z-[99998]"
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 99998,
            transition: 'all 0.3s ease',
          }}
        />
      </div>

      {/* Click backdrop to advance */}
      <div className="fixed inset-0 z-[99999]" onClick={() => !isLast ? setStep(step + 1) : handleFinish()} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="w-80 bg-bg-surface border border-border rounded-xl shadow-xl z-[100000] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-accent/5">
          <span className="text-[12px] font-bold text-accent">
            {t('stepOf', { current: String(step + 1), total: String(steps.length) })}
          </span>
          <button onClick={handleSkip} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <h3 className="text-[14px] font-bold text-text-primary mb-1">{current.title}</h3>
          <p className="text-[12px] text-text-muted leading-relaxed">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
          >
            {t('skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="h-7 px-2.5 flex items-center gap-1 text-[11px] font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-subtle transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                {t('back')}
              </button>
            )}
            <button
              onClick={() => isLast ? handleFinish() : setStep(step + 1)}
              className="h-7 px-3 flex items-center gap-1 text-[11px] font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
            >
              {isLast ? (
                <><Check className="h-3 w-3" /> {t('finish')}</>
              ) : (
                <>{t('next')} <ChevronRight className="h-3 w-3" /></>
              )}
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1 pb-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? 'bg-accent' : i < step ? 'bg-success' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
