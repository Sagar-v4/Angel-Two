"use client";

import { MarketDepth, MarketDepthItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MarketDepthDisplayProps {
  depth: MarketDepth | undefined;
  ltp?: number;
}

const DepthRowContent = ({
  item,
  type,
  maxTotalQty,
}: {
  item: MarketDepthItem;
  type: "buy" | "sell";
  maxTotalQty: number;
}) => {
  const percentage =
    maxTotalQty > 0 ? Math.min((item.quantity / maxTotalQty) * 100, 100) : 0; // Cap at 100%

  if (type === "buy") {
    return (
      <>
        <div className="text-left text-slate-400 tabular-nums pr-1">
          {item.orders}
        </div>
        <div className="text-left text-slate-200 tabular-nums pr-2 relative">
          <div
            className="absolute right-0 top-0 bottom-0 bg-green-500/20 z-0" // Bar grows from right to left
            style={{ width: `${percentage}%` }}
          ></div>
          <span className="relative z-10">
            {item.quantity.toLocaleString()}
          </span>
        </div>
        <div className="text-left text-green-400 font-semibold tabular-nums">
          {item.price.toFixed(2)}
        </div>
      </>
    );
  } else {
    // type === 'sell'
    return (
      <>
        <div className="text-right text-red-400 font-semibold tabular-nums">
          {item.price.toFixed(2)}
        </div>
        <div className="text-right text-slate-200 tabular-nums pl-2 relative">
          <div
            className="absolute left-0 top-0 bottom-0 bg-red-500/20 z-0" // Bar grows from left to right
            style={{ width: `${percentage}%` }}
          ></div>
          <span className="relative z-10">
            {item.quantity.toLocaleString()}
          </span>
        </div>
        <div className="text-right text-slate-400 tabular-nums pl-1">
          {item.orders}
        </div>
      </>
    );
  }
};

export function MarketDepthDisplay({ depth, ltp }: MarketDepthDisplayProps) {
  if (!depth || (!depth.buy?.length && !depth.sell?.length)) {
    return (
      <div className="text-center text-xs text-slate-500 py-4">
        Market depth data not available.
      </div>
    );
  }

  const bids = depth.buy?.slice(0, 5) || [];
  const asks = depth.sell?.slice(0, 5) || [];

  const allQuantities = [
    ...bids.map((b) => b.quantity),
    ...asks.map((a) => a.quantity),
  ];
  const maxTotalQty = Math.max(...allQuantities, 0);

  const totalBuyQuantity =
    depth.buy?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalSellQuantity =
    depth.sell?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="bg-slate-800/60 p-2 rounded-md border border-slate-700 text-slate-300 text-sm">
      <div className="text-center text-sm font-semibold text-slate-200 mb-3">
        Market Depth
      </div>
      {/* Headers */}
      <div className="grid grid-cols-2 gap-px bg-slate-700">
        {/* Use gap-px to create thin lines if desired */}
        {/* Buy Headers */}
        <div className="grid grid-cols-3 bg-slate-800 p-1 text-xs text-slate-400">
          <div className="text-left pl-1">Orders</div>
          <div className="text-left pl-1">Qty</div>
          <div className="text-left">Buy Price</div>
        </div>
        {/* Sell Headers */}
        <div className="grid grid-cols-3 bg-slate-800 p-1 text-xs text-slate-400">
          <div className="text-right">Sell Price</div>
          <div className="text-right pr-1">Qty</div>
          <div className="text-right pr-1">Orders</div>
        </div>
      </div>

      {/* Rows */}
      <div className="max-h-[160px] overflow-y-auto custom-scrollbar border border-slate-700 border-t-0">
        {Array.from({ length: 5 }).map(
          (
            _,
            index // Always render 5 rows for consistent layout
          ) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-px odd:bg-slate-800/30 even:bg-slate-800/10 hover:bg-slate-700/40 transition-colors duration-150"
            >
              {/* Buy Side Column */}
              <div
                className={cn(
                  "grid grid-cols-3 p-1.5 items-center text-xs border-r border-slate-700",
                  bids[index]?.price && ltp && bids[index].price > ltp
                    ? "opacity-60"
                    : "", // Dim if price is > LTP
                  bids[index]?.price && ltp && bids[index].price === ltp
                    ? "bg-sky-700/20"
                    : ""
                )}
              >
                {bids[index] ? (
                  <DepthRowContent
                    item={bids[index]}
                    type="buy"
                    maxTotalQty={maxTotalQty}
                  />
                ) : (
                  <>
                    <div>-</div>
                    <div>-</div>
                    <div>-</div>
                  </> // Placeholders
                )}
              </div>

              {/* Sell Side Column */}
              <div
                className={cn(
                  "grid grid-cols-3 p-1.5 items-center text-xs",
                  asks[index]?.price && ltp && asks[index].price < ltp
                    ? "opacity-60"
                    : "", // Dim if price is < LTP
                  asks[index]?.price && ltp && asks[index].price === ltp
                    ? "bg-sky-700/20"
                    : ""
                )}
              >
                {asks[index] ? (
                  <DepthRowContent
                    item={asks[index]}
                    type="sell"
                    maxTotalQty={maxTotalQty}
                  />
                ) : (
                  <>
                    <div>-</div>
                    <div>-</div>
                    <div>-</div>
                  </> // Placeholders
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Totals and Bid/Ask Summary */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex justify-between items-center text-xs px-1 mb-2">
          <div className="text-left">
            <span className="text-green-400 font-semibold">
              {totalBuyQuantity.toLocaleString()}
            </span>
            <span className="text-slate-500 ml-1">Total Buy Qty</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 mr-1">Total Sell Qty</span>
            <span className="text-red-400 font-semibold">
              {totalSellQuantity.toLocaleString()}
            </span>
          </div>
        </div>
        {bids[0] && asks[0] && (
          <div className="text-center text-sm font-medium text-slate-300 mt-1 py-2 bg-slate-700/70 rounded">
            Bid:{" "}
            <span className="text-green-400">{bids[0].price.toFixed(2)}</span>
            <span className="text-slate-500 mx-1">|</span>
            Ask:{" "}
            <span className="text-red-400">{asks[0].price.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
