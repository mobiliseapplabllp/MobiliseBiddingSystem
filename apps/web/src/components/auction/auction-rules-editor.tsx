'use client';

import { useState } from 'react';
import { Gavel, ChevronDown, Zap, Info } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface AuctionRuleConfig {
  auctionType: string;
  currency: string;
  startingPrice?: number;
  reservePrice?: number;
  decrementMin?: number;
  decrementMax?: number;
  durationMinutes?: number;
  extensionEnabled: boolean;
  extensionMinutes?: number;
  extensionTriggerMinutes?: number;
  maxExtensions?: number;
  bidVisibility: string;
  allowTiedBids: boolean;
  proxyBiddingEnabled: boolean;
  lotLevelBidding: boolean;
  notes?: string;
}

const PRESET_KEYS = [
  { key: 'ENGLISH_STANDARD', labelKey: 'presetEnglishStandard', descKey: 'presetEnglishStandardDesc' },
  { key: 'ENGLISH_TRANSPARENT', labelKey: 'presetEnglishTransparent', descKey: 'presetEnglishTransparentDesc' },
  { key: 'SEALED_BID', labelKey: 'presetSealedBid', descKey: 'presetSealedBidDesc' },
  { key: 'DUTCH', labelKey: 'presetDutch', descKey: 'presetDutchDesc' },
  { key: 'JAPANESE', labelKey: 'presetJapanese', descKey: 'presetJapaneseDesc' },
  { key: 'LOT_LEVEL', labelKey: 'presetLotLevel', descKey: 'presetLotLevelDesc' },
];

const PRESET_CONFIGS: Record<string, Partial<AuctionRuleConfig>> = {
  ENGLISH_STANDARD: { auctionType: 'ENGLISH', extensionEnabled: true, extensionMinutes: 5, extensionTriggerMinutes: 5, maxExtensions: 10, bidVisibility: 'RANK_ONLY', allowTiedBids: false, proxyBiddingEnabled: true, lotLevelBidding: false },
  ENGLISH_TRANSPARENT: { auctionType: 'ENGLISH', extensionEnabled: true, extensionMinutes: 5, extensionTriggerMinutes: 5, maxExtensions: 15, bidVisibility: 'RANK_AND_PRICE', allowTiedBids: false, proxyBiddingEnabled: true, lotLevelBidding: false },
  SEALED_BID: { auctionType: 'ENGLISH', extensionEnabled: false, bidVisibility: 'SEALED', allowTiedBids: true, proxyBiddingEnabled: false, lotLevelBidding: false },
  DUTCH: { auctionType: 'DUTCH', extensionEnabled: false, bidVisibility: 'RANK_AND_PRICE', allowTiedBids: false, proxyBiddingEnabled: false, lotLevelBidding: false },
  JAPANESE: { auctionType: 'JAPANESE', extensionEnabled: false, bidVisibility: 'RANK_AND_PRICE', allowTiedBids: false, proxyBiddingEnabled: false, lotLevelBidding: false },
  LOT_LEVEL: { auctionType: 'ENGLISH', extensionEnabled: true, extensionMinutes: 3, extensionTriggerMinutes: 3, maxExtensions: 5, bidVisibility: 'RANK_ONLY', allowTiedBids: false, proxyBiddingEnabled: true, lotLevelBidding: true },
};

interface AuctionRulesEditorProps {
  value: AuctionRuleConfig | null;
  onChange: (config: AuctionRuleConfig | null) => void;
  currency?: string;
}

const DEFAULT_CONFIG: AuctionRuleConfig = {
  auctionType: 'ENGLISH', currency: 'USD',
  extensionEnabled: true, extensionMinutes: 5, extensionTriggerMinutes: 5, maxExtensions: 10,
  bidVisibility: 'RANK_ONLY', allowTiedBids: false, proxyBiddingEnabled: true, lotLevelBidding: false,
};

const inputCls = 'w-full h-[38px] px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all';
const selectCls = inputCls;
const labelCls = 'block text-[12px] font-semibold text-gray-600 mb-1';

export function AuctionRulesEditor({ value, onChange, currency = 'USD' }: AuctionRulesEditorProps) {
  const t = useTranslations('auctionEditor');
  const [enabled, setEnabled] = useState(value != null);
  const [config, setConfig] = useState<AuctionRuleConfig>(value ?? { ...DEFAULT_CONFIG, currency });
  const [showAdvanced, setShowAdvanced] = useState(false);

  function toggle(on: boolean) {
    setEnabled(on);
    onChange(on ? config : null);
  }

  function update(patch: Partial<AuctionRuleConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    if (enabled) onChange(next);
  }

  function applyPreset(key: string) {
    const preset = PRESET_CONFIGS[key];
    if (preset) update({ ...preset, currency: config.currency });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Toggle header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <Gavel className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{t('title')}</h3>
            <p className="text-[11px] text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="sr-only" />
          <div className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`h-4 w-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${enabled ? 'translate-x-5 ms-0.5' : 'translate-x-0.5'}`} />
          </div>
          <span className="ms-2 text-xs font-medium text-gray-600">{enabled ? t('enabled') : t('disabled')}</span>
        </label>
      </div>

      {enabled && (
        <div className="px-5 py-4 space-y-5">
          {/* Preset selector */}
          <div>
            <p className={labelCls}>{t('quickPreset')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_KEYS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={`text-start px-3 py-2 rounded-lg border text-[12px] transition-all ${
                    PRESET_CONFIGS[p.key]?.auctionType === config.auctionType &&
                    PRESET_CONFIGS[p.key]?.bidVisibility === config.bidVisibility
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="font-semibold">{t(p.labelKey)}</span>
                  <br /><span className="text-[10px] text-gray-500">{t(p.descKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('auctionType')}</label>
              <select value={config.auctionType} onChange={(e) => update({ auctionType: e.target.value })} className={selectCls}>
                <option value="ENGLISH">{t('typeEnglish')}</option>
                <option value="DUTCH">{t('typeDutch')}</option>
                <option value="JAPANESE">{t('typeJapanese')}</option>
                <option value="RANK_ONLY">{t('typeRankOnly')}</option>
                <option value="VICKREY">{t('typeVickrey')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('bidVisibility')}</label>
              <select value={config.bidVisibility} onChange={(e) => update({ bidVisibility: e.target.value })} className={selectCls}>
                <option value="RANK_ONLY">{t('visibilityRankOnly')}</option>
                <option value="RANK_AND_PRICE">{t('visibilityRankAndPrice')}</option>
                <option value="SEALED">{t('visibilitySealed')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Starting Price ({config.currency})</label>
              <input type="number" value={config.startingPrice ?? ''} onChange={(e) => update({ startingPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ceiling price" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reserve Price ({config.currency})</label>
              <input type="number" value={config.reservePrice ?? ''} onChange={(e) => update({ reservePrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="Floor price" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Min Bid Decrease</label>
              <input type="number" value={config.decrementMin ?? ''} onChange={(e) => update({ decrementMin: e.target.value ? Number(e.target.value) : undefined })} placeholder="Min improvement per bid" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" value={config.durationMinutes ?? ''} onChange={(e) => update({ durationMinutes: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 120" className={inputCls} />
            </div>
          </div>

          {/* Extension rules */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-gray-700">Auto-Extension</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.extensionEnabled} onChange={(e) => update({ extensionEnabled: e.target.checked })} className="sr-only" />
                <div className={`w-8 h-4 rounded-full transition-colors ${config.extensionEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`h-3 w-3 bg-white rounded-full shadow transform transition-transform mt-0.5 ${config.extensionEnabled ? 'translate-x-4 ms-0.5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>
            {config.extensionEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500">Extend by (min)</label>
                  <input type="number" value={config.extensionMinutes ?? 5} onChange={(e) => update({ extensionMinutes: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Trigger if bid in last (min)</label>
                  <input type="number" value={config.extensionTriggerMinutes ?? 5} onChange={(e) => update({ extensionTriggerMinutes: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Max extensions</label>
                  <input type="number" value={config.maxExtensions ?? ''} onChange={(e) => update({ maxExtensions: e.target.value ? Number(e.target.value) : undefined })} placeholder="Unlimited" className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'proxyBiddingEnabled', label: 'Proxy Bidding', icon: Zap },
              { key: 'lotLevelBidding', label: 'Lot-Level Bidding', icon: Gavel },
              { key: 'allowTiedBids', label: 'Allow Tied Bids', icon: Info },
            ].map((t) => (
              <label key={t.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(config as Record<string, unknown>)[t.key]}
                  onChange={(e) => update({ [t.key]: e.target.checked } as Partial<AuctionRuleConfig>)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <t.icon className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-[13px] text-gray-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
