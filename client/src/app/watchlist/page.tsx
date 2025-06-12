"use client";

import { useMemo, useState } from "react";
import { AddToWatchlistDialog } from "@/components/watchlist/add-to-watchlist-dialog";
import { WatchlistItemDisplay } from "@/components/watchlist/watchlist-item";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useMarketData } from "@/hooks/use-market-data";
import { Exchange, OrderDialogSymbolData, TickerData } from "@/lib/types";
import { PlaceOrderDialog } from "@/components/watchlist/place-order-dialog";

export default function WatchlistPage() {
  const {
    addTokenToWatchlist,
    removeTokenFromWatchlist,
    getAllWatchlistItems,
    isLoaded: isWatchlistLoaded,
  } = useWatchlist();

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedSymbolForOrder, setSelectedSymbolForOrder] =
    useState<OrderDialogSymbolData | null>(null);

  const watchlistItems = useMemo(() => {
    if (isWatchlistLoaded) return getAllWatchlistItems();
    return [];
  }, [isWatchlistLoaded, getAllWatchlistItems]);

  const {
    tickerData,
    isLoading: isMarketDataLoading,
    error: marketDataError,
    fetchLTPData,
  } = useMarketData(watchlistItems);

  const handleRemoveToken = (exchange: Exchange, token: string) => {
    removeTokenFromWatchlist({ exchange, token });
  };

  const handleTradeAction = (symbolData: OrderDialogSymbolData) => {
    setSelectedSymbolForOrder(symbolData);
    setIsOrderDialogOpen(true);
  };

  // Callback to refresh data after order placement if needed
  const handleOrderPlaced = () => {
    // Optionally, refresh watchlist market data or order book
    // For instance, if you want to immediately reflect any price changes due to your order (though LTP is polled)
    // Or if you had an order book on this page you'd refresh it.
    if (watchlistItems.length > 0) {
      fetchLTPData(watchlistItems); // Re-fetch LTP data
    }
    // You might also want to refresh order book if it was displayed elsewhere
    // Example: fetchOrderBook(); (if you had such a function here)
  };

  // Combine watchlist items with their market data for rendering
  const displayItems = useMemo(() => {
    return watchlistItems.map((item) => {
      const key = `${item.exchange}:${item.token}`;
      const marketInfo = tickerData.get(key);
      return {
        exchange: item.exchange,
        symbol_token: item.token,
        trading_symbol: marketInfo?.trading_symbol,
        ltp: marketInfo?.ltp,
        previousLtp: marketInfo?.previousLtp,
        colorClass: marketInfo?.colorClass,
      };
    });
  }, [watchlistItems, tickerData]);

  if (!isWatchlistLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        Loading watchlist...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-sky-400">Watchlist</h1>
          <AddToWatchlistDialog onAddToken={addTokenToWatchlist} />
        </div>

        {marketDataError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md">
            Error fetching market data: {marketDataError}
          </div>
        )}

        {isMarketDataLoading && displayItems.length === 0 && (
          <div className="text-center py-4 text-slate-400">
            Fetching initial market data...
          </div>
        )}

        {displayItems.length === 0 && !isMarketDataLoading && (
          <div className="text-center py-10 text-slate-500">
            Your watchlist is empty. Click &quot;Add Symbol&quot; to get
            started.
          </div>
        )}

        {displayItems.length > 0 && (
          <div className="bg-slate-800 shadow-xl rounded-lg overflow-hidden">
            {displayItems.map((item) => (
              <WatchlistItemDisplay
                key={`${item.exchange}:${item.symbol_token}`}
                ticker={item as TickerData}
                onRemove={handleRemoveToken}
                onTrade={handleTradeAction}
              />
            ))}
          </div>
        )}
      </div>
      {selectedSymbolForOrder && (
        <PlaceOrderDialog
          isOpen={isOrderDialogOpen}
          onOpenChange={setIsOrderDialogOpen}
          symbolData={selectedSymbolForOrder}
          onOrderPlaced={handleOrderPlaced}
        />
      )}
    </div>
  );
}
