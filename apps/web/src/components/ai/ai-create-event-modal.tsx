'use client';

import { useState } from 'react';
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { api } from '@/lib/api-client';

interface GeneratedEvent {
  title?: string;
  description?: string;
  type?: string;
  estimatedValue?: number;
  currency?: string;
  lots?: Array<{
    title: string;
    description?: string;
    lineItems: Array<{
      description: string;
      quantity: string;
      uom: string;
      targetPrice: string;
      notes?: string;
    }>;
  }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (data: GeneratedEvent) => void;
}

export function AICreateEventModal({ open, onClose, onApply }: Props) {
  const t = useTranslations('events');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');

    try {
      const result = await api.post<{ plan?: { steps?: Array<{ details?: string }> }; response?: string }>('/ai/agent/execute', {
        instruction: prompt,
        context: 'EVENT_CREATION',
      });

      // Try to parse the AI response into structured event data
      const parsed = parseAIResponse(result);
      if (parsed) {
        onApply(parsed);
        onClose();
        setPrompt('');
      } else {
        setError('Could not parse AI response. Please try with more detail.');
      }
    } catch (err: unknown) {
      // If the AI agent fails, try the simpler generate-description + generate-line-items approach
      try {
        const descResult = await api.post<{ description?: string }>('/ai/rfx/generate-description', {
          title: extractTitle(prompt),
          eventType: 'RFQ',
          requirements: prompt,
        });

        const itemsResult = await api.post<{ items?: Array<{ description: string; quantity: number; uom: string; targetPrice: number }> }>('/ai/rfx/generate-line-items', {
          description: prompt,
          currency: 'USD',
        });

        const fallbackEvent: GeneratedEvent = {
          title: extractTitle(prompt),
          description: descResult.description ?? '',
          type: 'RFQ',
          currency: 'USD',
          lots: itemsResult.items ? [{
            title: 'Main Lot',
            lineItems: itemsResult.items.map((item) => ({
              description: item.description,
              quantity: String(item.quantity ?? 1),
              uom: item.uom ?? 'EA',
              targetPrice: String(item.targetPrice ?? 0),
            })),
          }] : [],
        };

        onApply(fallbackEvent);
        onClose();
        setPrompt('');
      } catch {
        const msg = err instanceof Error ? err.message : 'AI is not available right now';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-accent/5 to-transparent">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-text-primary">{t('aiCreateEventTitle')}</h3>
                <p className="text-[11px] text-text-muted">{t('aiCreateEventSuccess')}</p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('aiCreateEventPlaceholder')}
              rows={5}
              disabled={loading}
              className="w-full px-3 py-3 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none disabled:opacity-50"
            />

            {error && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-error/5 border border-error/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                <p className="text-[12px] text-error">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="btn-secondary text-[13px]"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="btn-primary flex items-center gap-2 text-[13px] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('aiCreateEventGenerating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('aiCreateEventGenerate')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractTitle(prompt: string): string {
  // Take first sentence or first 80 chars as title
  const firstSentence = prompt.split(/[.!?]/)[0]?.trim() ?? prompt;
  return firstSentence.length > 80 ? firstSentence.substring(0, 77) + '...' : firstSentence;
}

function parseAIResponse(result: unknown): GeneratedEvent | null {
  try {
    // The agent/execute endpoint returns { plan: { steps: [...] }, response: string }
    const data = result as Record<string, unknown>;

    // Try to find JSON in the response string
    const responseStr = typeof data.response === 'string' ? data.response : JSON.stringify(data);

    // Look for JSON block in the response
    const jsonMatch = responseStr.match(/\{[\s\S]*"title"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title,
        description: parsed.description,
        type: parsed.type ?? parsed.eventType,
        estimatedValue: parsed.estimatedValue,
        currency: parsed.currency,
        lots: parsed.lots,
      };
    }

    // Try to parse the whole response as JSON
    if (typeof data.response === 'string') {
      const parsed = JSON.parse(data.response);
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
