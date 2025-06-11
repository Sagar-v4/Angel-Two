"use client";

import { useState, useEffect, useCallback } from 'react';
import { Exchange, WatchlistItem } from '@/lib/types';

const NSE_WATCHLIST_KEY = 'nseWatchlistTokens';
const BSE_WATCHLIST_KEY = 'bseWatchlistTokens';

export function useWatchlist() {
  const [nseWatchlist, setNseWatchlist] = useState<string[]>([]);
  const [bseWatchlist, setBseWatchlist] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedNse = localStorage.getItem(NSE_WATCHLIST_KEY);
      const storedBse = localStorage.getItem(BSE_WATCHLIST_KEY);
      setNseWatchlist(storedNse ? JSON.parse(storedNse) : []);
      setBseWatchlist(storedBse ? JSON.parse(storedBse) : []);
      setIsLoaded(true);
    }
  }, []);

  const updateLocalStorage = (exchange: Exchange, tokens: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        exchange === 'NSE' ? NSE_WATCHLIST_KEY : BSE_WATCHLIST_KEY,
        JSON.stringify(tokens)
      );
    }
  };

  const addTokenToWatchlist = useCallback((item: WatchlistItem): boolean => {
    if (item.exchange === 'NSE') {
      if (!nseWatchlist.includes(item.token)) {
        const newNseWatchlist = [...nseWatchlist, item.token];
        setNseWatchlist(newNseWatchlist);
        updateLocalStorage('NSE', newNseWatchlist);
        return true;
      }
    } else {
      if (!bseWatchlist.includes(item.token)) {
        const newBseWatchlist = [...bseWatchlist, item.token];
        setBseWatchlist(newBseWatchlist);
        updateLocalStorage('BSE', newBseWatchlist);
        return true;
      }
    }
    return false; // Token already exists
  }, [nseWatchlist, bseWatchlist]);

  const removeTokenFromWatchlist = useCallback((item: WatchlistItem) => {
    if (item.exchange === 'NSE') {
      const newNseWatchlist = nseWatchlist.filter(t => t !== item.token);
      setNseWatchlist(newNseWatchlist);
      updateLocalStorage('NSE', newNseWatchlist);
    } else {
      const newBseWatchlist = bseWatchlist.filter(t => t !== item.token);
      setBseWatchlist(newBseWatchlist);
      updateLocalStorage('BSE', newBseWatchlist);
    }
  }, [nseWatchlist, bseWatchlist]);

  const getAllWatchlistItems = useCallback((): WatchlistItem[] => {
    const nseItems: WatchlistItem[] = nseWatchlist.map(token => ({ exchange: 'NSE', token }));
    const bseItems: WatchlistItem[] = bseWatchlist.map(token => ({ exchange: 'BSE', token }));
    return [...nseItems, ...bseItems];
  }, [nseWatchlist, bseWatchlist]);

  return {
    nseWatchlist,
    bseWatchlist,
    addTokenToWatchlist,
    removeTokenFromWatchlist,
    getAllWatchlistItems,
    isLoaded, // To know when data is loaded from localStorage
  };
}