"use client";

import { Exchange, OrderDialogSymbolData, TickerData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CandlestickChart, XIcon } from "lucide-react"; // For remove button

interface WatchlistItemDisplayProps {
  ticker: TickerData;
  onRemove: (exchange: Exchange, token: string) => void;
  onTrade: (symbolData: OrderDialogSymbolData) => void;
}

export function WatchlistItemDisplay({
  ticker,
  onRemove,
  onTrade,
}: WatchlistItemDisplayProps) {
  const handleTradeClick = () => {
    onTrade({
      exchange: ticker.exchange as Exchange, // Assuming TickerData.exchange is compatible with Exchange type
      symbolToken: ticker.symbol_token,
      tradingSymbol: ticker.trading_symbol,
      ltp: ticker.ltp,
    });
  };

  return (
    <div
      className={`flex justify-between items-center p-3 border-b border-slate-700 ${
        ticker.colorClass || "text-slate-300"
      }`}
    >
      <div>
        <span className="font-semibold text-sm text-slate-100">
          {ticker.exchange}:{ticker.symbol_token}
          {ticker.trading_symbol && ` (${ticker.trading_symbol})`}
        </span>
      </div>
      <div className="flex items-center">
        <span
          className={`text-lg font-mono mr-4 transition-colors duration-300`}
        >
          {ticker.ltp !== undefined ? ticker.ltp.toFixed(2) : "Loading..."}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="text-sky-400 border-sky-600 hover:bg-sky-600/20 hover:text-sky-300 h-8 px-2.5"
          onClick={handleTradeClick}
        >
          <CandlestickChart size={14} className="mr-1.5" /> Trade
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-red-500 hover:bg-slate-700 h-7 w-7"
          onClick={() =>
            onRemove(ticker.exchange as Exchange, ticker.symbol_token)
          }
        >
          <XIcon size={16} />
        </Button>
      </div>
    </div>
  );
}
