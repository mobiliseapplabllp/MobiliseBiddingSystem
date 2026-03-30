'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';

interface AIAssistButtonProps {
  /** API endpoint to call (e.g. '/ai/rfx/generate-description') */
  endpoint: string;
  /** Request body to send */
  payload: Record<string, unknown>;
  /** What to do with the AI result */
  onResult: (result: Record<string, unknown>) => void;
  /** Button label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

export function AIAssistButton({
  endpoint,
  payload,
  onResult,
  label,
  size = 'sm',
  className = '',
}: AIAssistButtonProps) {
  const t = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await api.post<Record<string, unknown>>(endpoint, payload);
      if (result.aiEnabled === false) {
        setError(result.message as string || 'AI not configured');
      } else {
        onResult(result);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-[12px] gap-1.5'
    : 'px-4 py-2 text-[13px] gap-2';

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center ${sizeClasses} rounded-lg font-medium transition-all ${
          loading
            ? 'bg-violet-100 text-violet-400 cursor-wait'
            : success
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : error
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 hover:border-violet-300'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : success ? (
          <CheckCircle className="h-3.5 w-3.5" />
        ) : error ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? t('aiGenerating', 'Generating...') : success ? t('aiDone', 'Done') : label ?? t('aiAssist', 'AI Assist')}
      </button>

      {error && (
        <div className="absolute top-full mt-1 end-0 z-10 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-600 max-w-[200px] shadow-sm">
          {error}
          <button onClick={() => setError(null)} className="ms-2 text-red-400 hover:text-red-600">
            <X className="h-3 w-3 inline" />
          </button>
        </div>
      )}
    </div>
  );
}
