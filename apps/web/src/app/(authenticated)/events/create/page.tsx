'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  Info, FileText, DollarSign, Gavel, TrendingDown, Layers,
  Plus, Trash2, AlertCircle, ChevronLeft, ChevronRight,
  Save, CheckCircle2, Users, ShieldCheck, Clock,
  Package, ClipboardList, Sparkles, Loader2, Briefcase,
} from 'lucide-react';
import { AICreateEventModal } from '@/components/ai/ai-create-event-modal';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MdmOption { code: string; label: string; }

interface LineItemForm {
  description: string;
  quantity: string;
  uom: string;
  targetPrice: string;
  notes: string;
}

interface LotForm {
  title: string;
  description: string;
  lineItems: LineItemForm[];
  ceilingPrice: string;
  reservePrice: string;
}

interface AuctionConfig {
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

type EventType = 'RFI' | 'RFP' | 'RFQ' | 'ITT' | 'REVERSE_AUCTION' | 'DUTCH_AUCTION' | 'JAPANESE_AUCTION';

interface EventForm {
  title: string;
  description: string;
  type: EventType;
  currency: string;
  estimatedValue: string;
  internalRef: string;
  // RFx timing
  submissionDeadline: string;
  clarificationDeadline: string;
  // RFQ rules
  allowBidAmendments: boolean;
  sealedUntilDeadline: boolean;
  // Auction timing
  previewPeriodEnabled: boolean;
  previewDurationHours: string;
  biddingStart: string;
  biddingEnd: string;
  overtimeTriggerMinutes: string;
  overtimeExtensionMinutes: string;
  overtimeMaxExtensions: string;
  // Auction config
  auctionConfig: AuctionConfig | null;
  // Lots
  lots: LotForm[];
}

const INITIAL_LINE_ITEM: LineItemForm = {
  description: '', quantity: '', uom: '', targetPrice: '', notes: '',
};

const INITIAL_LOT: LotForm = {
  title: '', description: '', lineItems: [{ ...INITIAL_LINE_ITEM }],
  ceilingPrice: '', reservePrice: '',
};

const INITIAL_FORM: EventForm = {
  title: '',
  description: '',
  type: 'RFQ',
  currency: 'USD',
  estimatedValue: '',
  internalRef: '',
  submissionDeadline: '',
  clarificationDeadline: '',
  allowBidAmendments: true,
  sealedUntilDeadline: false,
  previewPeriodEnabled: false,
  previewDurationHours: '24',
  biddingStart: '',
  biddingEnd: '',
  overtimeTriggerMinutes: '5',
  overtimeExtensionMinutes: '5',
  overtimeMaxExtensions: '10',
  auctionConfig: null,
  lots: [],
};

// ─── Event Type Definitions ─────────────────────────────────────────────────────

const EVENT_TYPES: {
  value: EventType;
  label: string;
  subtitle: string;
  icon: typeof Info;
  color: string;
  bgColor: string;
  borderColor: string;
  selectedBg: string;
}[] = [
  {
    value: 'RFI',
    label: 'RFI',
    subtitle: 'Collect supplier information and capabilities',
    icon: Info,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    selectedBg: 'bg-gray-50',
  },
  {
    value: 'RFP',
    label: 'RFP',
    subtitle: 'Request proposals with scoring and evaluation',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    selectedBg: 'bg-blue-50',
  },
  {
    value: 'RFQ',
    label: 'RFQ',
    subtitle: 'Request pricing quotes from suppliers',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    selectedBg: 'bg-amber-50',
  },
  {
    value: 'ITT',
    label: 'ITT',
    subtitle: 'Invite tenders for works, services, or supplies',
    icon: Briefcase,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    selectedBg: 'bg-orange-50',
  },
  {
    value: 'REVERSE_AUCTION',
    label: 'Reverse Auction',
    subtitle: 'Real-time competitive bidding, lowest price wins',
    icon: Gavel,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    selectedBg: 'bg-emerald-50',
  },
  {
    value: 'DUTCH_AUCTION',
    label: 'Dutch Auction',
    subtitle: 'Price auto-decreases, first to accept wins',
    icon: TrendingDown,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    selectedBg: 'bg-violet-50',
  },
  {
    value: 'JAPANESE_AUCTION',
    label: 'Japanese Auction',
    subtitle: 'Round-based elimination, must opt-in each round',
    icon: Layers,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    selectedBg: 'bg-cyan-50',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isAuctionType(type: EventType): boolean {
  return type === 'REVERSE_AUCTION' || type === 'DUTCH_AUCTION' || type === 'JAPANESE_AUCTION';
}

const inputCls =
  'w-full h-[42px] px-3.5 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all';
const textareaCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all resize-none';
const selectCls = inputCls;
const labelCls = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

// ─── Tab Definitions ────────────────────────────────────────────────────────────

interface TabDef {
  key: string;
  label: string;
  icon: typeof Info;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: ClipboardList },
  { key: 'items', label: 'Items', icon: Package },
  { key: 'suppliers', label: 'Suppliers', icon: Users },
  { key: 'rules', label: 'Rules', icon: ShieldCheck },
  { key: 'timing', label: 'Timing', icon: Clock },
];

// ─── Tab Bar ────────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: number;
  onTabChange: (idx: number) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      {TABS.map((tab, idx) => {
        const active = idx === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(idx)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Tab 1: Overview ────────────────────────────────────────────────────────────

function OverviewTab({
  form,
  onChange,
  currencies,
}: {
  form: EventForm;
  onChange: (patch: Partial<EventForm>) => void;
  currencies: MdmOption[];
}) {
  return (
    <div className="space-y-8">
      {/* Event Type Selector */}
      <div>
        <label className={labelCls}>Event Type</label>
        <p className="text-xs text-gray-500 mb-3">
          Select the type of sourcing event you want to create
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {EVENT_TYPES.map((et) => {
            const selected = form.type === et.value;
            const Icon = et.icon;
            return (
              <button
                key={et.value}
                type="button"
                onClick={() => onChange({ type: et.value })}
                className={`group relative text-start p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? `${et.borderColor} ${et.selectedBg} shadow-sm`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-lg ${
                    selected ? et.bgColor : 'bg-gray-100'
                  } flex items-center justify-center mb-3 transition-colors`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      selected ? et.color : 'text-gray-400 group-hover:text-gray-500'
                    } transition-colors`}
                  />
                </div>
                <div className="text-sm font-bold text-gray-900">{et.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  {et.subtitle}
                </div>
                {selected && (
                  <div
                    className={`absolute top-3 end-3 h-5 w-5 rounded-full ${et.bgColor} flex items-center justify-center`}
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${et.color}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className={labelCls}>
          Event Title <span className="text-red-500">*</span>
        </label>
        <input
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Supply of Office Furniture — Q2 2026"
          className={inputCls}
        />
      </div>

      {/* Description with AI Assist */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[13px] font-semibold text-gray-700">Description</label>
          <AIDescriptionButton
            title={form.title}
            eventType={form.type}
            estimatedValue={form.estimatedValue}
            onGenerated={(desc) => onChange({ description: desc })}
          />
        </div>
        <textarea
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe the scope, objectives, and requirements for this event..."
          rows={4}
          className={textareaCls}
        />
      </div>

      {/* Currency + Estimated Value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Currency</label>
          <select
            value={form.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            className={selectCls}
          >
            {currencies.length === 0 ? (
              <option value="USD">USD</option>
            ) : (
              currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className={labelCls}>Estimated Value</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.estimatedValue}
            onChange={(e) => onChange({ estimatedValue: e.target.value })}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
      </div>

      {/* Internal Reference */}
      <div>
        <label className={labelCls}>Internal Reference</label>
        <input
          value={form.internalRef}
          onChange={(e) => onChange({ internalRef: e.target.value })}
          placeholder="e.g. PROC-2026-042"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ─── Tab 2: Items (Lots & Line Items) ───────────────────────────────────────────

function ItemsTab({
  form,
  onChange,
  uoms,
}: {
  form: EventForm;
  onChange: (patch: Partial<EventForm>) => void;
  uoms: MdmOption[];
}) {
  const auction = isAuctionType(form.type);

  const updateLot = (lotIdx: number, patch: Partial<LotForm>) => {
    const lots = [...form.lots];
    lots[lotIdx] = { ...lots[lotIdx], ...patch };
    onChange({ lots });
  };

  const updateLineItem = (lotIdx: number, itemIdx: number, patch: Partial<LineItemForm>) => {
    const lots = [...form.lots];
    const items = [...lots[lotIdx].lineItems];
    items[itemIdx] = { ...items[itemIdx], ...patch };
    lots[lotIdx] = { ...lots[lotIdx], lineItems: items };
    onChange({ lots });
  };

  const addLot = () =>
    onChange({
      lots: [...form.lots, { ...INITIAL_LOT, lineItems: [{ ...INITIAL_LINE_ITEM }] }],
    });

  const removeLot = (idx: number) =>
    onChange({ lots: form.lots.filter((_, i) => i !== idx) });

  const addItem = (lotIdx: number) => {
    const lots = [...form.lots];
    lots[lotIdx] = {
      ...lots[lotIdx],
      lineItems: [...lots[lotIdx].lineItems, { ...INITIAL_LINE_ITEM }],
    };
    onChange({ lots });
  };

  const removeItem = (lotIdx: number, itemIdx: number) => {
    const lots = [...form.lots];
    lots[lotIdx] = {
      ...lots[lotIdx],
      lineItems: lots[lotIdx].lineItems.filter((_, i) => i !== itemIdx),
    };
    onChange({ lots });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Lots & Line Items</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Define lots and their line items for suppliers to price.
            {auction && ' Auction-specific fields are shown for each lot.'}
          </p>
        </div>
        <button
          type="button"
          onClick={addLot}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Lot
        </button>
      </div>

      {form.lots.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No lots added yet</p>
          <p className="text-xs text-gray-400 mb-4">
            Add lots now or after creating the event
          </p>
          <button
            type="button"
            onClick={addLot}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add First Lot
          </button>
        </div>
      )}

      {form.lots.map((lot, lotIdx) => (
        <div
          key={lotIdx}
          className="border border-gray-200 rounded-xl overflow-hidden bg-white"
        >
          {/* Lot Header */}
          <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
            <span className="text-sm font-bold text-gray-900">Lot {lotIdx + 1}</span>
            <div className="flex items-center gap-2">
              <AISuggestItemsButton
                currency={form.currency}
                onGenerated={(items) => {
                  const newItems = items.map((item) => ({
                    description: item.description,
                    quantity: String(item.quantity ?? 1),
                    uom: item.uom ?? 'EA',
                    targetPrice: String(item.targetPrice ?? 0),
                    notes: '',
                  }));
                  const updatedLot = { ...lot, lineItems: [...lot.lineItems, ...newItems] };
                  const updatedLots = [...form.lots];
                  updatedLots[lotIdx] = updatedLot;
                  onChange({ lots: updatedLots });
                }}
              />
              <button
                type="button"
                onClick={() => removeLot(lotIdx)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Lot Title */}
            <div>
              <label className={labelCls}>
                Lot Title <span className="text-red-500">*</span>
              </label>
              <input
                value={lot.title}
                onChange={(e) => updateLot(lotIdx, { title: e.target.value })}
                placeholder="e.g. Civil Works, IT Equipment"
                className={inputCls}
              />
            </div>

            {/* Lot Description */}
            <div>
              <label className={labelCls}>Lot Description</label>
              <textarea
                value={lot.description}
                onChange={(e) => updateLot(lotIdx, { description: e.target.value })}
                placeholder="Brief description of this lot..."
                rows={2}
                className={textareaCls}
              />
            </div>

            {/* Auction-specific lot fields */}
            {auction && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/50 rounded-lg p-4 border border-amber-200/50">
                <div>
                  <label className="block text-[12px] font-semibold text-amber-700 mb-1.5">
                    Ceiling Price ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lot.ceilingPrice}
                    onChange={(e) =>
                      updateLot(lotIdx, { ceilingPrice: e.target.value })
                    }
                    placeholder="Maximum bid allowed"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-amber-700 mb-1.5">
                    Reserve Price ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lot.reservePrice}
                    onChange={(e) =>
                      updateLot(lotIdx, { reservePrice: e.target.value })
                    }
                    placeholder="Minimum acceptable price"
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Line Items
                </span>
                <button
                  type="button"
                  onClick={() => addItem(lotIdx)}
                  className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-700 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>

              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                <span className="col-span-5 text-[11px] font-semibold text-gray-500 uppercase">
                  Description
                </span>
                <span className="col-span-2 text-[11px] font-semibold text-gray-500 uppercase">
                  Qty
                </span>
                <span className="col-span-2 text-[11px] font-semibold text-gray-500 uppercase">
                  UOM
                </span>
                <span className="col-span-2 text-[11px] font-semibold text-gray-500 uppercase">
                  Target Price
                </span>
                <span className="col-span-1" />
              </div>

              <div className="space-y-2">
                {lot.lineItems.map((item, itemIdx) => (
                  <div key={itemIdx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(lotIdx, itemIdx, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Item description"
                        className="w-full h-[36px] px-2.5 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(lotIdx, itemIdx, {
                            quantity: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="w-full h-[36px] px-2.5 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.uom}
                        onChange={(e) =>
                          updateLineItem(lotIdx, itemIdx, { uom: e.target.value })
                        }
                        className="w-full h-[36px] px-2 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                      >
                        <option value="">Select...</option>
                        {uoms.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.targetPrice}
                        onChange={(e) =>
                          updateLineItem(lotIdx, itemIdx, {
                            targetPrice: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        className="w-full h-[36px] px-2.5 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center pt-2">
                      {lot.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(lotIdx, itemIdx)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab 3: Suppliers ───────────────────────────────────────────────────────────

function SuppliersTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Invite Suppliers</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage which suppliers can participate in this event
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <h4 className="text-sm font-bold text-blue-900 mb-1">
          Suppliers will be invited after the event is created
        </h4>
        <p className="text-xs text-blue-700 leading-relaxed max-w-md mx-auto">
          Once you create this event in Draft status, you can search and invite
          suppliers from your supplier database. Suppliers will receive email
          notifications when the event is published.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          How it works
        </h4>
        <ol className="space-y-3">
          {[
            'Create the event in Draft status',
            'Search and invite suppliers from the Suppliers tab on the event detail page',
            'Suppliers receive invitations when the event is published',
            'Invited suppliers can then submit their bids or proposals',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Tab 4: Rules (Conditional) ─────────────────────────────────────────────────

function RulesTab({
  form,
  onChange,
}: {
  form: EventForm;
  onChange: (patch: Partial<EventForm>) => void;
}) {
  const { type } = form;

  // RFI - no rules needed
  if (type === 'RFI') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Bidding Rules</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Rules configuration for this event type
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-700 mb-1">
            No bidding rules needed
          </h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Requests for Information (RFI) are used to gather supplier
            capabilities and do not involve competitive bidding.
          </p>
        </div>
      </div>
    );
  }

  // RFP - evaluation criteria post-creation
  if (type === 'RFP') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Evaluation Rules</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Scoring and evaluation configuration
          </p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 text-center">
          <ShieldCheck className="h-8 w-8 text-violet-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-violet-900 mb-1">
            Evaluation criteria will be configured after creation
          </h4>
          <p className="text-xs text-violet-700 max-w-sm mx-auto">
            Once the event is created, you can define weighted evaluation
            criteria, scoring scales, and evaluator assignments from the event
            detail page.
          </p>
        </div>
      </div>
    );
  }

  // RFQ - basic rules
  if (type === 'RFQ') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Quote Rules</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure how suppliers can submit and manage their quotes
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <ToggleField
            label="Allow bid amendments"
            description="Suppliers can revise their submitted quotes before the deadline"
            checked={form.allowBidAmendments}
            onChange={(v) => onChange({ allowBidAmendments: v })}
          />
          <div className="border-t border-gray-100" />
          <ToggleField
            label="Sealed until deadline"
            description="All quotes remain sealed and invisible to buyers until the submission deadline passes"
            checked={form.sealedUntilDeadline}
            onChange={(v) => onChange({ sealedUntilDeadline: v })}
          />
        </div>
      </div>
    );
  }

  // Auction types - use AuctionRulesEditor
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Auction Rules</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure bidding rules, visibility, and auto-extension settings
        </p>
      </div>

      <AuctionRulesEditorLazy
        value={form.auctionConfig}
        onChange={(config) => onChange({ auctionConfig: config })}
        currency={form.currency}
      />
    </div>
  );
}

// Lazy-load the auction rules editor to avoid SSR issues
function AuctionRulesEditorLazy({
  value,
  onChange,
  currency,
}: {
  value: AuctionConfig | null;
  onChange: (config: AuctionConfig | null) => void;
  currency: string;
}) {
  const [Editor, setEditor] = useState<React.ComponentType<{
    value: AuctionConfig | null;
    onChange: (config: AuctionConfig | null) => void;
    currency?: string;
  }> | null>(null);

  useEffect(() => {
    import('@/components/auction/auction-rules-editor').then((mod) => {
      setEditor(() => mod.AuctionRulesEditor);
    });
  }, []);

  if (!Editor) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="animate-pulse text-sm text-gray-400">
          Loading auction configuration...
        </div>
      </div>
    );
  }

  return <Editor value={value} onChange={onChange} currency={currency} />;
}

// ─── Tab 5: Timing (Conditional) ────────────────────────────────────────────────

function TimingTab({
  form,
  onChange,
}: {
  form: EventForm;
  onChange: (patch: Partial<EventForm>) => void;
}) {
  const auction = isAuctionType(form.type);

  if (!auction) {
    // RFI / RFP / RFQ timing
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Timing & Deadlines</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Set key dates for this sourcing event
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <div>
            <label className={labelCls}>
              Submission Deadline <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              The final date and time by which suppliers must submit their responses
            </p>
            <input
              type="datetime-local"
              value={form.submissionDeadline}
              onChange={(e) => onChange({ submissionDeadline: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="border-t border-gray-100" />

          <div>
            <label className={labelCls}>Clarification Deadline</label>
            <p className="text-xs text-gray-400 mb-2">
              The last date by which suppliers can ask questions about this event
            </p>
            <input
              type="datetime-local"
              value={form.clarificationDeadline}
              onChange={(e) => onChange({ clarificationDeadline: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>
    );
  }

  // Auction timing
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Auction Timing</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure the auction schedule and overtime rules
        </p>
      </div>

      {/* Preview Period */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <ToggleField
          label="Preview Period"
          description="Allow suppliers to view lot details before bidding opens"
          checked={form.previewPeriodEnabled}
          onChange={(v) => onChange({ previewPeriodEnabled: v })}
        />
        {form.previewPeriodEnabled && (
          <div className="ps-12">
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">
              Preview Duration (hours)
            </label>
            <input
              type="number"
              min="1"
              value={form.previewDurationHours}
              onChange={(e) =>
                onChange({ previewDurationHours: e.target.value })
              }
              placeholder="24"
              className={inputCls + ' max-w-[200px]'}
            />
          </div>
        )}
      </div>

      {/* Bidding Window */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Bidding Window
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Bidding Start <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.biddingStart}
              onChange={(e) => onChange({ biddingStart: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Bidding End <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.biddingEnd}
              onChange={(e) => onChange({ biddingEnd: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Overtime / Extension */}
      <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Overtime (Auto-Extension)
          </h4>
        </div>
        <p className="text-xs text-amber-600">
          If a bid is received within the trigger window before closing, the
          auction is automatically extended.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-amber-700 mb-1.5">
              Trigger (minutes before close)
            </label>
            <input
              type="number"
              min="1"
              value={form.overtimeTriggerMinutes}
              onChange={(e) =>
                onChange({ overtimeTriggerMinutes: e.target.value })
              }
              placeholder="5"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-amber-700 mb-1.5">
              Extension (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={form.overtimeExtensionMinutes}
              onChange={(e) =>
                onChange({ overtimeExtensionMinutes: e.target.value })
              }
              placeholder="5"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-amber-700 mb-1.5">
              Max Extensions
            </label>
            <input
              type="number"
              min="0"
              value={form.overtimeMaxExtensions}
              onChange={(e) =>
                onChange({ overtimeMaxExtensions: e.target.value })
              }
              placeholder="10"
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Toggle Component ────────────────────────────────────────────────────

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <label className="relative inline-flex items-center cursor-pointer mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors ${
            checked ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`h-4 w-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
              checked ? 'translate-x-5 ms-0.5' : 'translate-x-0.5'
            }`}
          />
        </div>
      </label>
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

// ─── AI Helper Components ──────────────────────────────────────────────────────

function AIDescriptionButton({
  title,
  eventType,
  estimatedValue,
  onGenerated,
}: {
  title: string;
  eventType: string;
  estimatedValue: string;
  onGenerated: (desc: string) => void;
}) {
  const t = useTranslations('events');
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.post<{ description?: string; result?: string }>('/ai/rfx/generate-description', {
        title,
        eventType,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      });
      const desc = res.description ?? res.result ?? '';
      if (desc) onGenerated(desc);
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!title.trim() || loading}
      title={title.trim() ? t('aiGenerateDescriptionTooltip') : t('aiRequiresTitle')}
      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-accent bg-accent/5 hover:bg-accent/10 rounded-lg border border-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {loading ? t('aiGenerating') : t('aiGenerateDescription')}
    </button>
  );
}

function AISuggestItemsButton({
  currency,
  onGenerated,
}: {
  currency: string;
  onGenerated: (items: Array<{ description: string; quantity: number; uom: string; targetPrice: number }>) => void;
}) {
  const t = useTranslations('events');
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.post<{ items?: Array<{ description: string; quantity: number; uom: string; targetPrice: number }> }>('/ai/rfx/generate-line-items', {
        description: prompt,
        currency,
      });
      if (res.items && res.items.length > 0) {
        onGenerated(res.items);
        setOpen(false);
        setPrompt('');
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-accent bg-accent/5 hover:bg-accent/10 rounded-lg border border-accent/20 transition-all"
      >
        <Sparkles className="h-3 w-3" />
        {t('aiSuggestItems')}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/20 z-50" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
              <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                {t('aiSuggestItemsTitle')}
              </h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('aiSuggestItemsPlaceholder')}
                rows={4}
                className={textareaCls}
                disabled={loading}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-[13px]">Cancel</button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || loading}
                  className="btn-primary flex items-center gap-2 text-[13px] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {loading ? t('aiSuggestItemsGenerating') : t('aiSuggestItemsGenerate')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const t = useTranslations('events');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<EventForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [currencies, setCurrencies] = useState<MdmOption[]>([]);
  const [uoms, setUoms] = useState<MdmOption[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  useEffect(() => {
    api.get<MdmOption[]>('/master-data?type=CURRENCY').then(setCurrencies).catch(() => {});
    api.get<MdmOption[]>('/master-data?type=UOM').then(setUoms).catch(() => {});
  }, []);

  const updateForm = useCallback(
    (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch })),
    [],
  );

  const buildPayload = useCallback(() => {
    const auction = isAuctionType(form.type);
    return {
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      currency: form.currency,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      internalRef: form.internalRef || undefined,
      // RFx timing
      ...(!auction && {
        submissionDeadline: form.submissionDeadline
          ? new Date(form.submissionDeadline).toISOString()
          : undefined,
        clarificationDeadline: form.clarificationDeadline
          ? new Date(form.clarificationDeadline).toISOString()
          : undefined,
      }),
      // RFQ rules
      ...(form.type === 'RFQ' && {
        allowBidAmendments: form.allowBidAmendments,
        sealedUntilDeadline: form.sealedUntilDeadline,
      }),
      // Auction timing
      ...(auction && {
        biddingStart: form.biddingStart
          ? new Date(form.biddingStart).toISOString()
          : undefined,
        biddingEnd: form.biddingEnd
          ? new Date(form.biddingEnd).toISOString()
          : undefined,
        previewPeriodEnabled: form.previewPeriodEnabled,
        previewDurationHours: form.previewPeriodEnabled
          ? Number(form.previewDurationHours)
          : undefined,
        overtimeTriggerMinutes: form.overtimeTriggerMinutes
          ? Number(form.overtimeTriggerMinutes)
          : undefined,
        overtimeExtensionMinutes: form.overtimeExtensionMinutes
          ? Number(form.overtimeExtensionMinutes)
          : undefined,
        overtimeMaxExtensions: form.overtimeMaxExtensions
          ? Number(form.overtimeMaxExtensions)
          : undefined,
      }),
      // Auction config
      ...(auction && form.auctionConfig && { auctionConfig: form.auctionConfig }),
      // Lots
      lots: form.lots
        .filter((l) => l.title.trim())
        .map((l) => ({
          title: l.title,
          description: l.description || undefined,
          ...(auction && {
            ceilingPrice: l.ceilingPrice ? Number(l.ceilingPrice) : undefined,
            reservePrice: l.reservePrice ? Number(l.reservePrice) : undefined,
          }),
          lineItems: l.lineItems
            .filter((li) => li.description.trim())
            .map((li) => ({
              description: li.description,
              quantity: li.quantity ? Number(li.quantity) : undefined,
              uom: li.uom || undefined,
              targetPrice: li.targetPrice ? Number(li.targetPrice) : undefined,
              notes: li.notes || undefined,
            })),
        })),
    };
  }, [form]);

  const validate = useCallback((): string => {
    if (!form.title.trim()) return 'Event title is required.';
    return '';
  }, [form.title]);

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      setActiveTab(0); // Go back to Overview tab for title
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = buildPayload();
      const created = await api.post<{ id: string; refNumber: string }>(
        '/rfx-events',
        payload,
      );
      router.push(`/events/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create event');
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const err = validate();
    if (err) {
      setError(err);
      setActiveTab(0);
      return;
    }
    setSavingDraft(true);
    setError('');
    try {
      const payload = { ...buildPayload(), status: 'DRAFT' };
      const created = await api.post<{ id: string; refNumber: string }>(
        '/rfx-events',
        payload,
      );
      router.push(`/events/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
      setSavingDraft(false);
    }
  };

  const goNext = () => {
    if (activeTab < TABS.length - 1) {
      setError('');
      setActiveTab((t) => t + 1);
    }
  };

  const goPrev = () => {
    if (activeTab > 0) {
      setError('');
      setActiveTab((t) => t - 1);
    }
  };

  const isLastTab = activeTab === TABS.length - 1;

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('createSourcingEvent', 'Create Sourcing Event')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('createEventSubtitle', 'Set up your procurement event using the guided sourcing workflow')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-lg shadow-sm transition-all hover:shadow-md"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}
        >
          <Sparkles className="h-4 w-4" />
          {t('aiCreateEvent')}
        </button>
      </div>

      {/* AI Create Event Modal */}
      <AICreateEventModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApply={(data) => {
          updateForm({
            ...(data.title ? { title: data.title } : {}),
            ...(data.description ? { description: data.description } : {}),
            ...(data.type ? { type: data.type as EventType } : {}),
            ...(data.estimatedValue ? { estimatedValue: String(data.estimatedValue) } : {}),
            ...(data.currency ? { currency: data.currency } : {}),
            ...(data.lots ? {
              lots: data.lots.map((lot) => ({
                title: lot.title,
                description: lot.description ?? '',
                ceilingPrice: '',
                reservePrice: '',
                lineItems: lot.lineItems.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  uom: item.uom,
                  targetPrice: item.targetPrice,
                  notes: item.notes ?? '',
                })),
              })),
            } : {}),
          });
        }}
      />

      {/* Tab Bar */}
      <div className="mb-6">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 sm:p-8">
          {activeTab === 0 && (
            <OverviewTab
              form={form}
              onChange={updateForm}
              currencies={currencies}
            />
          )}
          {activeTab === 1 && (
            <ItemsTab form={form} onChange={updateForm} uoms={uoms} />
          )}
          {activeTab === 2 && <SuppliersTab />}
          {activeTab === 3 && <RulesTab form={form} onChange={updateForm} />}
          {activeTab === 4 && <TimingTab form={form} onChange={updateForm} />}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 sm:mx-8 mb-0">
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="px-6 sm:px-8 py-4 border-t border-gray-200 flex items-center justify-between mt-2">
          {/* Left: Save as Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {savingDraft ? t('saving', 'Saving...') : t('saveAsDraft', 'Save as Draft')}
          </button>

          {/* Right: Navigation + Create */}
          <div className="flex items-center gap-3">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('previous', 'Previous')}
              </button>
            )}

            {!isLastTab && (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t('next', 'Next')}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {isLastTab && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || savingDraft}
                className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {submitting ? t('creating', 'Creating...') : t('createEvent', 'Create Event')}
                {!submitting && <CheckCircle2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Draft info banner */}
      <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          The event will be created in <strong>DRAFT</strong> status. You can
          edit all details and invite suppliers before publishing.
        </p>
      </div>
    </div>
  );
}
