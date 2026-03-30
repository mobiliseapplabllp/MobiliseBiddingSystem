'use client';

import { Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface AIInsightCardProps {
  title?: string;
  type?: 'info' | 'success' | 'warning' | 'risk';
  children: React.ReactNode;
  className?: string;
}

const STYLES = {
  info: { bg: 'bg-violet-50', border: 'border-violet-200', icon: Sparkles, iconColor: 'text-violet-600' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-600' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' },
  risk: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-600' },
};

export function AIInsightCard({ title, type = 'info', children, className = '' }: AIInsightCardProps) {
  const t = useTranslations('common');
  const style = STYLES[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Icon className={`h-4 w-4 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[13px] font-semibold text-gray-900">{title ?? t('aiInsight', 'AI Insight')}</p>
            <span className="text-[9px] font-bold text-violet-500 bg-violet-100 px-1.5 py-0.5 rounded">AI</span>
          </div>
          <div className="text-[13px] text-gray-700 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
