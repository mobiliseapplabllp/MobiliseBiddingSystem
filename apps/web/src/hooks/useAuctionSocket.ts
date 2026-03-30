'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface BidPlacedEvent {
  bidId: string;
  auctionId: string;
  supplierId: string;
  bidPrice: number;
  rank: number | null;
  timestamp: string;
}

export interface AuctionExtendedEvent {
  auctionId: string;
  extensionNumber: number;
  previousEndAt: string;
  newEndAt: string;
  timestamp: string;
}

export interface AuctionClosedEvent {
  auctionId: string;
  totalBids: number;
  timestamp: string;
}

export interface AuctionOpenedEvent {
  auctionId: string;
  endAt: string;
  timestamp: string;
}

interface UseAuctionSocketOptions {
  auctionId: string;
  enabled?: boolean;
  onBidPlaced?: (event: BidPlacedEvent) => void;
  onExtended?: (event: AuctionExtendedEvent) => void;
  onClosed?: (event: AuctionClosedEvent) => void;
  onOpened?: (event: AuctionOpenedEvent) => void;
}

export function useAuctionSocket({
  auctionId,
  enabled = true,
  onBidPlaced,
  onExtended,
  onClosed,
  onOpened,
}: UseAuctionSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [recentBids, setRecentBids] = useState<BidPlacedEvent[]>([]);
  const [bidCount, setBidCount] = useState(0);
  const [lastExtension, setLastExtension] = useState<AuctionExtendedEvent | null>(null);

  useEffect(() => {
    if (!enabled || !auctionId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${apiUrl}/auctions`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-auction', { auctionId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('bid-placed', (event: BidPlacedEvent) => {
      setRecentBids((prev) => [event, ...prev].slice(0, 50)); // Keep last 50
      setBidCount((prev) => prev + 1);
      onBidPlaced?.(event);
    });

    socket.on('auction-extended', (event: AuctionExtendedEvent) => {
      setLastExtension(event);
      onExtended?.(event);
    });

    socket.on('auction-closed', (event: AuctionClosedEvent) => {
      onClosed?.(event);
    });

    socket.on('auction-opened', (event: AuctionOpenedEvent) => {
      onOpened?.(event);
    });

    return () => {
      socket.emit('leave-auction', { auctionId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [auctionId, enabled]);

  const clearBids = useCallback(() => setRecentBids([]), []);

  return {
    connected,
    recentBids,
    bidCount,
    lastExtension,
    clearBids,
  };
}
