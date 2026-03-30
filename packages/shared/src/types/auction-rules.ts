/**
 * AuctionRuleConfig — structured configuration for auction rules.
 * Stored as JSON in RfxEvent.auctionConfig and used to auto-populate Auction creation.
 */

export interface AuctionRuleConfig {
  // ── Auction Type ──
  auctionType: 'ENGLISH' | 'DUTCH' | 'JAPANESE' | 'RANK_ONLY' | 'RANK_WITH_WINNING_BID' | 'VICKREY' | 'MULTI_ATTRIBUTE';

  // ── Pricing Rules ──
  currency: string;
  startingPrice?: number;      // Initial price (ceiling for reverse auctions)
  reservePrice?: number;       // Floor price — bids below this are rejected (sealed) or hidden
  decrementMin?: number;       // Minimum bid improvement required
  decrementMax?: number;       // Maximum bid improvement allowed per bid

  // ── Timing ──
  durationMinutes?: number;    // Planned auction duration in minutes (e.g. 120 = 2 hours)
  scheduledStartAt?: string;   // ISO 8601 planned start time

  // ── Extension Rules ──
  extensionEnabled: boolean;
  extensionMinutes?: number;         // Minutes to extend by (default 5)
  extensionTriggerMinutes?: number;  // Extend if bid arrives within last N minutes (default 5)
  maxExtensions?: number;            // null = unlimited

  // ── Visibility ──
  bidVisibility: 'RANK_ONLY' | 'RANK_AND_PRICE' | 'SEALED';
  allowTiedBids: boolean;

  // ── Proxy Bidding ──
  proxyBiddingEnabled: boolean;

  // ── Lot-Level Rules ──
  lotLevelBidding: boolean;    // If true, suppliers bid per-lot instead of per-auction

  // ── Description (human-readable summary, optional) ──
  notes?: string;
}

/**
 * AUCTION_RULE_PRESETS — predefined rule configurations for common auction types.
 * Buyers can select a preset and then customize.
 */
export const AUCTION_RULE_PRESETS: Record<string, { label: string; description: string; config: AuctionRuleConfig }> = {
  ENGLISH_STANDARD: {
    label: 'English Reverse Auction (Standard)',
    description: 'Price goes down. Suppliers compete to offer the lowest price. Most common type.',
    config: {
      auctionType: 'ENGLISH',
      currency: 'USD',
      extensionEnabled: true,
      extensionMinutes: 5,
      extensionTriggerMinutes: 5,
      maxExtensions: 10,
      bidVisibility: 'RANK_ONLY',
      allowTiedBids: false,
      proxyBiddingEnabled: true,
      lotLevelBidding: false,
    },
  },
  ENGLISH_TRANSPARENT: {
    label: 'English Reverse Auction (Transparent)',
    description: 'All suppliers see current best price and their rank. Maximum competition.',
    config: {
      auctionType: 'ENGLISH',
      currency: 'USD',
      extensionEnabled: true,
      extensionMinutes: 5,
      extensionTriggerMinutes: 5,
      maxExtensions: 15,
      bidVisibility: 'RANK_AND_PRICE',
      allowTiedBids: false,
      proxyBiddingEnabled: true,
      lotLevelBidding: false,
    },
  },
  SEALED_BID: {
    label: 'Sealed Bid (Single Round)',
    description: 'Suppliers submit one blind bid. No one sees others\' prices until auction closes.',
    config: {
      auctionType: 'ENGLISH',
      currency: 'USD',
      extensionEnabled: false,
      bidVisibility: 'SEALED',
      allowTiedBids: true,
      proxyBiddingEnabled: false,
      lotLevelBidding: false,
    },
  },
  DUTCH: {
    label: 'Dutch Auction',
    description: 'Price starts high and decreases over time. First supplier to accept wins.',
    config: {
      auctionType: 'DUTCH',
      currency: 'USD',
      extensionEnabled: false,
      bidVisibility: 'RANK_AND_PRICE',
      allowTiedBids: false,
      proxyBiddingEnabled: false,
      lotLevelBidding: false,
    },
  },
  JAPANESE: {
    label: 'Japanese Auction',
    description: 'Price decreases in rounds. Suppliers must opt-in each round or get eliminated.',
    config: {
      auctionType: 'JAPANESE',
      currency: 'USD',
      extensionEnabled: false,
      bidVisibility: 'RANK_AND_PRICE',
      allowTiedBids: false,
      proxyBiddingEnabled: false,
      lotLevelBidding: false,
    },
  },
  LOT_LEVEL: {
    label: 'Lot-Level Reverse Auction',
    description: 'Suppliers bid on individual lots separately. Different winners per lot possible.',
    config: {
      auctionType: 'ENGLISH',
      currency: 'USD',
      extensionEnabled: true,
      extensionMinutes: 3,
      extensionTriggerMinutes: 3,
      maxExtensions: 5,
      bidVisibility: 'RANK_ONLY',
      allowTiedBids: false,
      proxyBiddingEnabled: true,
      lotLevelBidding: true,
    },
  },
};

/**
 * AUCTION_RULE_CATEGORIES — for UI display, grouping rules into readable sections
 */
export const AUCTION_RULE_CATEGORIES = [
  {
    key: 'type',
    label: 'Auction Type',
    fields: ['auctionType'],
  },
  {
    key: 'pricing',
    label: 'Pricing Rules',
    fields: ['currency', 'startingPrice', 'reservePrice', 'decrementMin', 'decrementMax'],
  },
  {
    key: 'timing',
    label: 'Timing',
    fields: ['durationMinutes', 'scheduledStartAt'],
  },
  {
    key: 'extension',
    label: 'Extension Rules',
    fields: ['extensionEnabled', 'extensionMinutes', 'extensionTriggerMinutes', 'maxExtensions'],
  },
  {
    key: 'visibility',
    label: 'Visibility & Behavior',
    fields: ['bidVisibility', 'allowTiedBids', 'proxyBiddingEnabled', 'lotLevelBidding'],
  },
];
