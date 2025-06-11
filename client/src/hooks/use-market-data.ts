"use client";

import { useState, useEffect, useCallback } from 'react';
import { WatchlistItem, Exchange, TickerData, FullLTPResponse, MarketLTPData } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_BASE_URL || 'http://localhost:8080';

export function useMarketData(initialWatchlistItems: WatchlistItem[]) {
  const [tickerData, setTickerData] = useState<Map<string, TickerData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLTPData = useCallback(async (itemsToFetch: WatchlistItem[]) => {
    if (itemsToFetch.length === 0) {
      // If nothing to fetch, update tickerData to remove items not in watchlist anymore
      // or clear if watchlist is empty
      setTickerData(prevData => {
        const newData = new Map<string, TickerData>();
        itemsToFetch.forEach(item => {
          const key = `${item.exchange}:${item.token}`;
          if (prevData.has(key)) {
            newData.set(key, prevData.get(key)!);
          }
        });
        return newData;
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    const groupedByExchange: Record<Exchange, string[]> = { NSE: [], BSE: [] };
    itemsToFetch.forEach(item => {
      groupedByExchange[item.exchange].push(item.token);
    });

    const exchangeTokenPayload: { exchange: string; tokens: string[] }[] = [];
    if (groupedByExchange.NSE.length > 0) {
      exchangeTokenPayload.push({ exchange: 'NSE', tokens: groupedByExchange.NSE });
    }
    if (groupedByExchange.BSE.length > 0) {
      exchangeTokenPayload.push({ exchange: 'BSE', tokens: groupedByExchange.BSE });
    }

    if (exchangeTokenPayload.length === 0) {
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/market/ltp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange_tokens: exchangeTokenPayload }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch LTP data" }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const result: FullLTPResponse = await response.json();

      if (!result.status || !result.data) {
        setError(result.message || 'Failed to fetch data (API reported error)');
        setIsLoading(false);
        // Keep existing data for items that might still be valid if some failed
        return;
      }
      
      setTickerData(prevData => {
        const newData = new Map(prevData); // Start with a copy of previous data

        // Update with fetched data
        result.data?.fetched.forEach((fetchedItem: MarketLTPData) => {
          const key = `${fetchedItem.exchange}:${fetchedItem.symbol_token}`;
          const previousItem = prevData.get(key);
          let colorClass = previousItem?.colorClass || 'text-slate-300'; // Default or keep old

          if (previousItem?.ltp !== undefined) {
            if (fetchedItem.ltp > previousItem.ltp) {
              colorClass = 'text-green-400';
            } else if (fetchedItem.ltp < previousItem.ltp) {
              colorClass = 'text-red-400';
            }
          }
          newData.set(key, {
            ...fetchedItem,
            previousLtp: previousItem?.ltp,
            colorClass,
          });
        });
        
        // Handle unfetched items - maybe mark them as errored or remove them
        // For now, we're not explicitly removing, just not updating them.
        // If an item that was previously fetched is now unfetched, it will remain with its old data.
        // To explicitly clear data for items no longer in initialWatchlistItems:
        const currentWatchlistKeys = new Set(itemsToFetch.map(i => `${i.exchange}:${i.token}`));
        for (const key of newData.keys()) {
            if (!currentWatchlistKeys.has(key)) {
                newData.delete(key);
            }
        }

        return newData;
      });

    } catch (err) {
      console.error("Error fetching LTP data:", err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies means this function's identity is stable

  // Effect to fetch data when initialWatchlistItems changes (from useWatchlist)
  // and periodically
  useEffect(() => {
    if (initialWatchlistItems.length > 0) {
      fetchLTPData(initialWatchlistItems); // Initial fetch
    } else {
      setTickerData(new Map()); // Clear data if watchlist is empty
    }

    const intervalId = setInterval(() => {
      if (initialWatchlistItems.length > 0) {
         fetchLTPData(initialWatchlistItems);
      }
    }, 1000); // Fetch every 1 second

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [initialWatchlistItems, fetchLTPData]); // fetchLTPData is stable due to useCallback([])

  return { tickerData, isLoading, error };
}