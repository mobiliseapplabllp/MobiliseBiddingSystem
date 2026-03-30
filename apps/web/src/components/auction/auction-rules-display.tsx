'use client';

import {
  Gavel, DollarSign, Clock, Shield, Eye, Users, Zap, Layers,
  ChevronDown, ChevronUp, ArrowDownRight, Timer, Lock,
} from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { formatNumber } from '@/lib/format';

interface AuctionRuleConfig {
  auctionType?: string;
  currency?: string;
  startingPrice?: number;
  reservePrice?: number;
  decrementMin?: number;
  decrementMax?: number;
  durationMinutes?: number;
  scheduledStartAt?: string;
  extensionEnabled?: boolean;
  extensionMinutes?: number;
  extensionTriggerMinutes?: number;
  maxExtensions?: number;
  bidVisibility?: string;
  allowTiedBids?: boolean;
  proxyBiddingEnabled?: boolean;
  lotLevelBidding?: boolean;
  notes?: string;
}

const TYPE_KEYS: Record<string, string> = {
  ENGLISH: 'typeEnglish',
  DUTCH: 'typeDutch',
  JAPANESE: 'typeJapanese',
  RANK_ONLY: 'typeRankOnly',
  RANK_WITH_WINNING_BID: 'typeRankWithWinning',
  VICKREY: 'typeVickrey',
  MULTI_ATTRIBUTE: 'typeMultiAttribute',
};

const VISIBILITY_KEYS: Record<string, string> = {
  RANK_ONLY: 'visibilityRankOnly',
  RANK_AND_PRICE: 'visibilityRankAndPrice',
  SEALED: 'visibilitySealed',
};

interface AuctionRulesDisplayProps {
  config: AuctionRuleConfig | null | undefined;
  compact?: boolean;
}

function RuleRow({ icon: Icon, label, value, color = 'text-gray-900' }: {
  icon: React.ElementType; label: string; value: string | React.ReactNode; color?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] text-gray-500">{label}</span>
        <p className={`text-[13px] font-medium ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export function AuctionRulesDisplay({ config, compact = false }: AuctionRulesDisplayProps) {
  const t = useTranslations('auctionRules');
  if (!config) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
        <Gavel className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{t('noRulesConfigured')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('configureRulesHint')}</p>
      </div>
    );
  }

  const fmt = (n?: number) => n != null ? formatNumber(n) : '—';

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Gavel className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-gray-900">{t('title')}</h3>
        <span className="ms-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
          {TYPE_KEYS[config.auctionType ?? ''] ? t(TYPE_KEYS[config.auctionType ?? '']) : config.auctionType}
        </span>
      </div>

      <div className={`px-5 py-3 ${compact ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-x-6'} divide-y divide-gray-50`}>
        {/* Pricing */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-2 mb-1">{t('sectionPricing')}</p>
          <RuleRow icon={DollarSign} label={t('currency')} value={config.currency ?? 'USD'} />
          {config.startingPrice != null && (
            <RuleRow icon={ArrowDownRight} label={t('startingPrice')} value={`${config.currency ?? 'USD'} ${fmt(config.startingPrice)}`} color="text-blue-700" />
          )}
          {config.reservePrice != null && (
            <RuleRow icon={Lock} label={t('reservePrice')} value={`${config.currency ?? 'USD'} ${fmt(config.reservePrice)}`} color="text-red-600" />
          )}
          {config.decrementMin != null && (
            <RuleRow icon={ArrowDownRight} label={t('minBidDecrease')} value={`${config.currency ?? 'USD'} ${fmt(config.decrementMin)}`} />
          )}
          {config.decrementMax != null && (
            <RuleRow icon={ArrowDownRight} label={t('maxBidDecrease')} value={`${config.currency ?? 'USD'} ${fmt(config.decrementMax)}`} />
          )}
        </div>

        {/* Timing & Extensions */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-2 mb-1">{t('sectionTiming')}</p>
          {config.durationMinutes != null && (
            <RuleRow icon={Clock} label={t('plannedDuration')} value={t('durationMinutes', { minutes: String(config.durationMinutes) })} />
          )}
          <RuleRow
            icon={Timer}
            label={t('autoExtension')}
            value={config.extensionEnabled
              ? `${t('extensionDetails', { extend: String(config.extensionMinutes ?? 5), trigger: String(config.extensionTriggerMinutes ?? 5) })}${config.maxExtensions ? ` ${t('extensionMaxed', { max: String(config.maxExtensions) })}` : ` ${t('extensionUnlimited')}`}`
              : t('disabled')}
            color={config.extensionEnabled ? 'text-emerald-700' : 'text-gray-500'}
          />
        </div>

        {/* Visibility */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-2 mb-1">{t('sectionVisibility')}</p>
          <RuleRow
            icon={Eye}
            label={t('bidVisibility')}
            value={VISIBILITY_KEYS[config.bidVisibility ?? ''] ? t(VISIBILITY_KEYS[config.bidVisibility ?? '']) : config.bidVisibility ?? '—'}
          />
          <RuleRow icon={Users} label={t('tiedBids')} value={config.allowTiedBids ? t('allowed') : t('notAllowed')} />
        </div>

        {/* Behavior */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-2 mb-1">{t('sectionBehavior')}</p>
          <RuleRow
            icon={Zap}
            label={t('proxyBidding')}
            value={config.proxyBiddingEnabled ? t('proxyEnabled') : t('disabled')}
            color={config.proxyBiddingEnabled ? 'text-emerald-700' : 'text-gray-500'}
          />
          <RuleRow
            icon={Layers}
            label={t('lotLevelBidding')}
            value={config.lotLevelBidding ? t('perLot') : t('wholeAuction')}
            color={config.lotLevelBidding ? 'text-blue-700' : 'text-gray-500'}
          />
        </div>
      </div>

      {config.notes && (
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-[12px] text-gray-500">{config.notes}</p>
        </div>
      )}
    </div>
  );
}
