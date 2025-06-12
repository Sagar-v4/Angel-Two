"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // Using ToggleGroup for BUY/SELL
import {
  FullQuoteData,
  OrderDialogSymbolData,
  OrderFormState,
  PlaceOrderPayload,
  FullPlaceOrderResponse,
  FullQuoteApiResponse,
} from "@/lib/types";
import { MarketDepthDisplay } from "@/components/watchlist/market-depth-display";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_GO_API_BASE_URL || "http://localhost:8080";

interface PlaceOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  symbolData: OrderDialogSymbolData | null;
  onOrderPlaced?: () => void; // Callback to refresh order book or other actions
}

const initialFormState: OrderFormState = {
  transactionType: "BUY",
  activeTab: "regular",
  productType: "DELIVERY",
  quantity: "1", // Default to 1
  orderTypeMarket: true, // Default to Market order
  price: "",
  duration: "DAY",
  disclosedQuantity: "0",
  triggerPrice: "",
};

export function PlaceOrderDialog({
  isOpen,
  onOpenChange,
  symbolData: initialSymbolData,
  onOrderPlaced,
}: PlaceOrderDialogProps) {
  const [formState, setFormState] = useState<OrderFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for live quote data including depth
  const [currentQuote, setCurrentQuote] = useState<FullQuoteData | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Use initialSymbolData.ltp as fallback until full quote loads
  const displayLTP = currentQuote?.ltp ?? initialSymbolData?.ltp ?? 0;

  // Fetch full quote data when dialog opens or symbol changes
  const fetchFullQuote = useCallback(async (symbol: OrderDialogSymbolData) => {
    if (!symbol) return;
    setIsQuoteLoading(true);
    setQuoteError(null);
    try {
      const payload = {
        exchange_tokens: [
          { exchange: symbol.exchange, tokens: [symbol.symbolToken] },
        ],
      };
      const response = await fetch(`${API_BASE_URL}/api/market/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: "Failed to fetch quote" }));
        throw new Error(errData.message || `API Error: ${response.status}`);
      }
      const result: FullQuoteApiResponse = await response.json();
      if (result.status && result.data && result.data.fetched.length > 0) {
        setCurrentQuote(result.data.fetched[0]);
      } else {
        throw new Error(result.message || "No quote data received.");
      }
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching full quote:", err);
    } finally {
      setIsQuoteLoading(false);
    }
  }, []);

  // Reset form when dialog opens or symbolData changes
  useEffect(() => {
    if (isOpen && initialSymbolData) {
      setFormState({
        ...initialFormState,
        price: initialSymbolData.ltp.toFixed(2),
      });
      fetchFullQuote(initialSymbolData); // Initial fetch

      // Setup interval for refreshing quote data
      const intervalId = setInterval(() => {
        fetchFullQuote(initialSymbolData);
      }, 1000); // Refresh every 3 seconds, adjust as needed

      return () => clearInterval(intervalId); // Cleanup interval
    } else {
      setCurrentQuote(null); // Reset quote data when dialog closes
      setQuoteError(null);
    }
  }, [isOpen, initialSymbolData, fetchFullQuote]);

  // Update price input if order type changes to Market AND live quote is available
  useEffect(() => {
    if (
      formState.orderTypeMarket &&
      currentQuote &&
      typeof currentQuote.ltp === "number"
    ) {
      setFormState((prev) => {
        // Only update if the new LTP is different from the current price in the form,
        // or if the price field is empty (e.g., initial load for market order).
        // This prevents overriding user input if they briefly switch to limit and back to market.
        const currentPriceInForm = parseFloat(prev.price);
        if (
          isNaN(currentPriceInForm) ||
          currentPriceInForm !== currentQuote.ltp
        ) {
          return { ...prev, price: currentQuote.ltp.toFixed(2) };
        }
        return prev; // No change needed
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.orderTypeMarket, currentQuote?.ltp]);

  const handleInputChange = (field: keyof OrderFormState, value: unknown) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const qty = parseInt(formState.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Invalid Quantity", {
        description: "Quantity must be a positive number.",
      });
      return false;
    }

    if (!formState.orderTypeMarket) {
      // Limit Order
      const limitPrice = parseFloat(formState.price);
      if (isNaN(limitPrice) || limitPrice <= 0) {
        toast.error("Invalid Price", {
          description: "Limit price must be a positive number.",
        });
        return false;
      }
    }

    if (formState.activeTab === "stoploss") {
      const trigPrice = parseFloat(formState.triggerPrice);
      if (isNaN(trigPrice) || trigPrice <= 0) {
        toast.error("Invalid Trigger Price", {
          description: "SL Trigger price must be a positive number.",
        });
        return false;
      }
      // Basic SL price validation (can be more complex)
      if (formState.transactionType === "BUY" && trigPrice < displayLTP) {
        toast.warning("Invalid SL Trigger", {
          description:
            "For SL Buy, trigger price should generally be above LTP.",
        });
        // Potentially allow, but warn
      }
      if (formState.transactionType === "SELL" && trigPrice > displayLTP) {
        toast.warning("Invalid SL Trigger", {
          description:
            "For SL Sell, trigger price should generally be below LTP.",
        });
      }

      if (!formState.orderTypeMarket) {
        // SL-Limit
        const limitPrice = parseFloat(formState.price);
        if (isNaN(limitPrice) || limitPrice <= 0) {
          toast.error("Invalid SL Limit Price", {
            description:
              "SL Limit price must be a positive number for SL-Limit orders.",
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmitOrder = async () => {
    const symbolToUse = initialSymbolData; // Use the one passed when dialog opened
    if (!symbolToUse || !validateForm()) return;

    setIsSubmitting(true);

    let orderTypeApi: PlaceOrderPayload["ordertype"];
    let priceApi = 0;
    let triggerPriceApi = 0;

    if (formState.activeTab === "regular") {
      orderTypeApi = formState.orderTypeMarket ? "MARKET" : "LIMIT";
      if (!formState.orderTypeMarket) {
        priceApi = parseFloat(formState.price);
      }
    } else {
      // Stop Loss Tab
      orderTypeApi = formState.orderTypeMarket
        ? "STOPLOSS_MARKET"
        : "STOPLOSS_LIMIT";
      triggerPriceApi = parseFloat(formState.triggerPrice);
      if (!formState.orderTypeMarket) {
        // SL-Limit
        priceApi = parseFloat(formState.price);
      }
    }

    const payload: Omit<PlaceOrderPayload, "angel_one_jwt"> = {
      // Omit angel_one_jwt as it's added by API service
      variety: "NORMAL", // For standard and SL orders
      tradingsymbol:
        symbolToUse.tradingSymbol || `${symbolToUse.symbolToken}-EQ`, // Fallback if not provided
      symboltoken: symbolToUse.symbolToken,
      transactiontype: formState.transactionType,
      exchange: symbolToUse.exchange,
      ordertype: orderTypeApi,
      producttype: formState.productType,
      duration: formState.activeTab === "stoploss" ? "DAY" : formState.duration, // IOC often not for SL
      price: priceApi,
      quantity: parseInt(formState.quantity),
      disclosedquantity: parseInt(formState.disclosedQuantity) || 0,
      triggerprice: triggerPriceApi,
      squareoff: 0, // Default for non-BO/CO
      stoploss: 0, // Default for non-BO/CO
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result: FullPlaceOrderResponse = await response.json();

      if (response.ok && result.status) {
        toast.success("Order Placed Successfully", {
          description: `Order ID: ${result.data?.orderid}. Symbol: ${
            symbolToUse.tradingSymbol || symbolToUse.symbolToken
          }`,
        });
        onOpenChange(false); // Close dialog
        if (onOrderPlaced) onOrderPlaced(); // Callback to refresh data
      } else {
        toast.error("Order Placement Failed", {
          description:
            result.message || result.errorcode || "Unknown error from server.",
        });
      }
    } catch (err) {
      toast.error("Order Request Error", {
        description:
          err instanceof Error
            ? err.message
            : "Could not connect to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!initialSymbolData) return null; // Don't render if no symbol data

  const isBuy = formState.transactionType === "BUY";
  const accentColor = isBuy
    ? "bg-green-600 hover:bg-green-700"
    : "bg-red-600 hover:bg-red-700";
  const dialogAccentBorder = isBuy
    ? "border-green-500 focus-visible:ring-green-500"
    : "border-red-500 focus-visible:ring-red-500";
  const headerBgColor = isBuy ? "bg-green-500/10" : "bg-red-500/10";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden text-white",
          isBuy
            ? "bg-gradient-to-br from-green-900/20 via-slate-900 to-slate-900"
            : "bg-gradient-to-br from-red-900/20 via-slate-900 to-slate-900",
          dialogAccentBorder
        )}
      >
        {/* Header Section */}
        <div className={cn("p-4 md:p-6", headerBgColor)}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <ToggleGroup
                type="single"
                defaultValue="BUY"
                value={formState.transactionType}
                onValueChange={(value: "BUY" | "SELL") => {
                  if (value) handleInputChange("transactionType", value);
                }}
                className="mb-2"
              >
                <ToggleGroupItem
                  value="BUY"
                  aria-label="Toggle Buy"
                  className={cn(
                    "data-[state=on]:bg-green-600 data-[state=on]:text-white hover:bg-green-500/80",
                    !isBuy && "bg-slate-700 text-slate-400"
                  )}
                >
                  BUY
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="SELL"
                  aria-label="Toggle Sell"
                  className={cn(
                    "data-[state=on]:bg-red-600 data-[state=on]:text-white hover:bg-red-500/80",
                    isBuy && "bg-slate-700 text-slate-400"
                  )}
                >
                  SELL
                </ToggleGroupItem>
              </ToggleGroup>
              <DialogTitle className="text-xl font-semibold text-slate-100">
                {initialSymbolData.tradingSymbol ||
                  initialSymbolData.symbolToken}
              </DialogTitle>
            </div>
            <div className="text-right mt-6">
              <div className="flex items-center justify-end space-x-2">
                {isQuoteLoading && (
                  <RefreshCw
                    size={14}
                    className="animate-spin text-slate-500"
                  />
                )}
                <p className="text-xs text-slate-400">
                  {initialSymbolData.exchange}:{initialSymbolData.symbolToken}
                </p>
              </div>
              <p className={`text-xl md:text-2xl font-bold text-white`}>
                {typeof displayLTP === "number" ? displayLTP.toFixed(2) : "N/A"}
              </p>
              {currentQuote &&
                typeof currentQuote.close === "number" &&
                currentQuote.close !== 0 &&
                typeof currentQuote.netChange === "number" &&
                typeof currentQuote.percentChange === "number" && (
                  <p
                    className={`text-xs ${
                      currentQuote.netChange >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {currentQuote.netChange >= 0 ? "+" : ""}
                    {currentQuote.netChange.toFixed(2)} (
                    {currentQuote.percentChange.toFixed(2)}%)
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Main Content: Tabs and Market Depth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left Side: Order Form Tabs */}
          <div className="md:col-span-1">
            <Tabs
              value={formState.activeTab}
              onValueChange={(value) => handleInputChange("activeTab", value)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 rounded-none h-12 border-b border-slate-700">
                <TabsTrigger
                  value="regular"
                  className="data-[state=active]:bg-sky-600 text-white rounded-none"
                >
                  Regular
                </TabsTrigger>
                <TabsTrigger
                  value="stoploss"
                  className="data-[state=active]:bg-sky-600 text-white rounded-none"
                >
                  Stop Loss
                </TabsTrigger>
              </TabsList>

              <div className="p-4 md:p-6 space-y-4 max-h-[calc(60vh-50px)] md:max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
                {/* Product Type */}
                <div>
                  <Label className="text-sm text-slate-400 mb-1.5 block">
                    Product Type
                  </Label>
                  <RadioGroup
                    defaultValue="DELIVERY"
                    value={formState.productType}
                    onValueChange={(value: "DELIVERY" | "INTRADAY") =>
                      handleInputChange("productType", value)
                    }
                    className="flex space-x-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="INTRADAY"
                        id="intraday"
                        className="text-sky-500 border-slate-600"
                      />
                      <Label htmlFor="intraday" className="text-slate-200">
                        Intraday (MIS)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="DELIVERY"
                        id="delivery"
                        className="text-sky-500 border-slate-600"
                      />
                      <Label htmlFor="delivery" className="text-slate-200">
                        Delivery (CNC)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="mt-3">
                    <Label
                      htmlFor="quantity"
                      className="text-sm text-slate-400"
                    >
                      Quantity
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0"
                      min="1"
                      value={formState.quantity}
                      onChange={(e) =>
                        handleInputChange("quantity", e.target.value)
                      }
                      className="bg-slate-700 border-slate-600 focus:ring-sky-500 mt-1 text-white"
                    />
                  </div>
                  <div className="mt-3">
                    <Label htmlFor="price" className="text-sm text-slate-400">
                      Price
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      step="0.05"
                      value={formState.price}
                      onChange={(e) =>
                        handleInputChange("price", e.target.value)
                      }
                      disabled={
                        (formState.orderTypeMarket &&
                          formState.activeTab === "regular") ||
                        (formState.orderTypeMarket &&
                          formState.activeTab === "stoploss" &&
                          currentQuote?.ltp === 0)
                      }
                      className="bg-slate-700 border-slate-600 focus:ring-sky-500 mt-1 text-white"
                    />
                  </div>
                </div>
                <RadioGroup
                  defaultValue="limit"
                  value={formState.orderTypeMarket ? "market" : "limit"}
                  onValueChange={(value) =>
                    handleInputChange("orderTypeMarket", value === "market")
                  }
                  className="flex space-x-3 items-center mt-1"
                >
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem
                      value="limit"
                      id="limit"
                      className="text-sky-500 border-slate-600"
                    />
                    <Label htmlFor="limit" className="text-xs text-slate-300">
                      Limit
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem
                      value="market"
                      id="market"
                      className="text-sky-500 border-slate-600"
                    />
                    <Label htmlFor="market" className="text-xs text-slate-300">
                      Market
                    </Label>
                  </div>
                </RadioGroup>

                {/* Stop Loss Specific: Trigger Price */}
                {formState.activeTab === "stoploss" && (
                  <div className="mt-3">
                    <Label
                      htmlFor="triggerPrice"
                      className="text-sm text-slate-400"
                    >
                      SL Trigger Price
                    </Label>
                    <Input
                      id="triggerPrice"
                      type="number"
                      placeholder="0.00"
                      step="0.05"
                      value={formState.triggerPrice}
                      onChange={(e) =>
                        handleInputChange("triggerPrice", e.target.value)
                      }
                      className="bg-slate-700 border-slate-600 focus:ring-sky-500 mt-1 text-white"
                    />
                  </div>
                )}

                <Separator className="bg-slate-700 my-3" />

                {/* Validity & Disclose Qty */}
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="mt-3">
                    <Label className="text-sm text-slate-400 mb-3 block">
                      Validity
                    </Label>
                    <RadioGroup
                      defaultValue="DAY"
                      value={formState.duration}
                      onValueChange={(value: "DAY" | "IOC") =>
                        handleInputChange("duration", value)
                      }
                      className="flex space-x-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="DAY"
                          id="day"
                          className="text-sky-500 border-slate-600"
                        />
                        <Label htmlFor="day" className="text-slate-200">
                          Day
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="IOC"
                          id="ioc"
                          className="text-sky-500 border-slate-600"
                          disabled={formState.activeTab === "stoploss"}
                        />
                        <Label
                          htmlFor="ioc"
                          className={cn(
                            "text-slate-200",
                            formState.activeTab === "stoploss" &&
                              "text-slate-600"
                          )}
                        >
                          IOC
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="mt-3">
                    <Label
                      htmlFor="disclosedQuantity"
                      className="text-sm text-slate-400"
                    >
                      Disclose Qty
                    </Label>
                    <Input
                      id="disclosedQuantity"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formState.disclosedQuantity}
                      onChange={(e) =>
                        handleInputChange("disclosedQuantity", e.target.value)
                      }
                      className="bg-slate-700 border-slate-600 focus:ring-sky-500 mt-1 text-white"
                    />
                  </div>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Right Side: Market Depth */}
          <div className="md:col-span-1 p-4 md:p-6 md:border-l border-slate-700 max-h-[calc(60vh-50px)] md:max-h-[calc(100vh-230px)] overflow-y-auto custom-scrollbar">
            <h3 className="text-md font-semibold text-slate-300 mb-3">
              Market Depth & Quote
            </h3>
            {isQuoteLoading && !currentQuote && (
              <div className="text-center text-slate-400 py-5">
                Loading depth...
              </div>
            )}
            {quoteError && (
              <div className="text-center text-red-400 py-5 text-xs">
                Error: {quoteError}
              </div>
            )}
            {currentQuote && (
              <MarketDepthDisplay
                depth={currentQuote.depth}
                ltp={currentQuote.ltp}
              />
            )}
            {!isQuoteLoading && !currentQuote && !quoteError && (
              <div className="text-center text-slate-500 py-5 text-xs">
                No depth data.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 md:p-6 bg-slate-800/80 border-t border-slate-700">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="border-slate-600 hover:bg-slate-700 text-primary hover:text-primary-foreground"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className={cn("w-full md:w-auto", accentColor)}
          >
            {isSubmitting ? (
              <svg
                className="animate-spin h-5 w-5 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : null}{" "}
            Place {formState.transactionType} Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
