"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Terminal, BookOpen, Ban } from "lucide-react";
import {
  FullHoldingsResponse,
  PortfolioHoldingsData,
  OrderBookItem,
  FullOrderBookResponse,
} from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner"; // For feedback

const API_BASE_URL =
  process.env.NEXT_PUBLIC_GO_API_BASE_URL || "http://localhost:8080";
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
];

// Helper function to determine if an order is cancellable
const isOrderCancellable = (status: string | undefined): boolean => {
  if (!status) return false;
  const cancellableStatuses = [
    "open",
    "pending",
    "trigger pending",
    "validation pending", // Add other statuses based on Angel One's documentation
    "put order req received",
    // "modified" might also be cancellable depending on its sub-state
  ];
  return cancellableStatuses.includes(status.toLowerCase());
};

export default function PortfolioPage() {
  const [holdingsData, setHoldingsData] =
    useState<PortfolioHoldingsData | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookItem[]>([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(true);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [orderBookError, setOrderBookError] = useState<string | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState<string | null>(
    null
  ); // To track which order is being cancelled

  const hasFetchedHoldings = useRef(false);
  const hasFetchedOrderBook = useRef(false);

  const fetchOrderBook = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoadingOrderBook(true);
    setOrderBookError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/book`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
        throw new Error(
          errData.message || `HTTP error! Status: ${response.status}`
        );
      }
      const result: FullOrderBookResponse = await response.json();
      if (result.status) setOrderBook(result.data || []);
      else throw new Error(result.message || "Failed to fetch order book");
    } catch (err) {
      setOrderBookError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      if (showLoadingIndicator) setIsLoadingOrderBook(false);
    }
  }, []); // Empty dependency array, as it doesn't depend on component state directly

  const fetchHoldings = useCallback(async () => {
    setIsLoadingHoldings(true);
    setHoldingsError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/holdings`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
        throw new Error(
          errData.message || `HTTP error! Status: ${response.status}`
        );
      }
      const result: FullHoldingsResponse = await response.json();
      if (result.status && result.data) setHoldingsData(result.data);
      else throw new Error(result.message || "Failed to fetch holdings data");
    } catch (err) {
      setOrderBookError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsLoadingHoldings(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedHoldings.current) {
      fetchHoldings();
      hasFetchedHoldings.current = true;
    }
    if (!hasFetchedOrderBook.current) {
      fetchOrderBook();
      hasFetchedOrderBook.current = true;
    }
  }, [fetchHoldings, fetchOrderBook]);

  const handleCancelOrder = async (variety: string, orderId: string) => {
    setIsCancellingOrder(orderId); // Show loading state for this specific order
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variety, orderid: orderId }),
      });

      const result = await response.json();

      if (response.ok && result.status) {
        toast.success(
          result.message || `Order ${orderId} cancellation request submitted.`
        );
        // Refresh order book after a short delay to allow backend to process
        setTimeout(() => fetchOrderBook(false), 1500); // Refresh without main loading indicator
      } else {
        toast.error(result.message || "Could not cancel the order.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsCancellingOrder(null);
    }
  };

  const chartData = useMemo(() => {
    /* ... same as before ... */
    if (!holdingsData?.holdings || holdingsData.holdings.length === 0)
      return [];
    return holdingsData.holdings.map((holding) => ({
      name: holding.tradingsymbol,
      value: holding.quantity * holding.ltp,
    }));
  }, [holdingsData]);

  const renderLoading = (item: string /* ... same as before ... */) => (
    <div className="flex min-h-[200px] items-center justify-center text-slate-400">
      <svg
        className="animate-spin h-8 w-8 text-sky-500 mr-3"
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
      Loading {item}...
    </div>
  );
  const renderError = (
    item: string,
    errorMsg: string | null /* ... same as before ... */
  ) => (
    <Alert
      variant="destructive"
      className="my-4 bg-slate-800 border-red-700 text-red-300"
    >
      <Terminal className="h-4 w-4" />
      <AlertTitle>Error Fetching {item}</AlertTitle>
      <AlertDescription>{errorMsg}</AlertDescription>
    </Alert>
  );

  if (
    isLoadingHoldings &&
    !hasFetchedHoldings.current &&
    isLoadingOrderBook &&
    !hasFetchedOrderBook.current
  ) {
    // Adjusted initial loading
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-900 text-white">
        {/* Main loading spinner */}
        <svg
          className="animate-spin h-10 w-10 text-sky-500 mb-4"
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
        Loading portfolio data...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <h1 className="text-3xl font-semibold text-sky-400">
          Portfolio Overview
        </h1>

        {/* Holdings Summary Section - same as before */}
        {isLoadingHoldings &&
          !holdingsData &&
          renderLoading("Holdings Summary")}
        {holdingsError && renderError("Holdings Summary", holdingsError)}
        {holdingsData &&
          holdingsData.totalholding /* ... Summary Cards ... */ && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">
                    Total Investment
                  </CardDescription>
                  <CardTitle className="text-2xl text-sky-300">
                    ₹
                    {holdingsData.totalholding.totalinvvalue?.toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">
                    Current Value
                  </CardDescription>
                  <CardTitle className="text-2xl text-emerald-400">
                    ₹
                    {holdingsData.totalholding.totalholdingvalue?.toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">
                    Overall P&L
                  </CardDescription>
                  <CardTitle
                    className={`text-2xl ${
                      holdingsData.totalholding.totalprofitandloss >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    ₹
                    {holdingsData.totalholding.totalprofitandloss?.toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="text-xs text-slate-500 pt-1">
                  ({holdingsData.totalholding.totalpnlpercentage?.toFixed(2)}%)
                </CardFooter>
              </Card>
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription className="text-slate-400">
                    No. of Scrips
                  </CardDescription>
                  <CardTitle className="text-2xl text-slate-200">
                    {holdingsData.holdings?.length || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}


        {/* Order Book Section - Updated with Cancel Button */}
        <div className="mt-10">
          <Card className="w-full bg-slate-800 border-slate-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-sky-300 flex items-center">
                <BookOpen size={24} className="mr-3 text-sky-400" /> Order Book
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your pending and recently executed orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOrderBook &&
                !hasFetchedOrderBook.current &&
                renderLoading("Order Book")}{" "}
              {/* Show loading only on initial fetch */}
              {orderBookError && renderError("Order Book", orderBookError)}
              {!isLoadingOrderBook && !orderBookError && (
                <ScrollArea className="w-full whitespace-nowrap rounded-md border border-slate-700 max-h-[400px]">
                  <Table>
                    {orderBook.length === 0 && (
                      <TableCaption className="py-10 text-slate-500">
                        No orders in your order book.
                      </TableCaption>
                    )}
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-700/50">
                        <TableHead className="text-slate-400">Symbol</TableHead>
                        <TableHead className="text-slate-400">Type</TableHead>
                        <TableHead className="text-slate-400 text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-slate-400 text-right">
                          Price
                        </TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Time</TableHead>
                        <TableHead className="text-slate-400 text-center">
                          Actions
                        </TableHead>
                        {/* Actions Column */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderBook.map((order) => (
                        <TableRow
                          key={order.uniqueorderid || order.orderid}
                          className="border-slate-600 hover:bg-slate-700/50"
                        >
                          <TableCell className="font-medium text-slate-100">
                            {order.tradingsymbol}
                          </TableCell>
                          <TableCell
                            className={`capitalize ${
                              order.transactiontype?.toUpperCase() === "BUY"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {order.transactiontype?.toLowerCase()}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">
                            {order.quantity}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">
                            {order.price}
                          </TableCell>
                          <TableCell className="text-slate-300 capitalize">
                            {order.status?.toLowerCase()}
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs">
                            {order.updatetime}
                          </TableCell>
                          <TableCell className="text-center">
                            {isOrderCancellable(order.status) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-400 hover:bg-red-900/30 px-2 py-1 h-auto"
                                    disabled={
                                      isCancellingOrder === order.orderid
                                    } // Disable button while this order is being cancelled
                                  >
                                    {isCancellingOrder === order.orderid ? (
                                      <svg
                                        className="animate-spin h-4 w-4 mr-1.5"
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
                                    ) : (
                                      <Ban size={14} className="mr-1" />
                                    )}
                                    Cancel
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Confirm Order Cancellation
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                      Are you sure you want to cancel the order
                                      for {order.tradingsymbol} (ID: 
                                      {order.orderid})? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="hover:bg-slate-700 border-slate-600 text-primary hover:text-primary-foreground">
                                      Back
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() =>
                                        handleCancelOrder(
                                          order.variety,
                                          order.orderid
                                        )
                                      }
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table and Chart Section - same as before */}
        {isLoadingHoldings && !holdingsData && !holdingsError && (
          <div className="mt-8">{renderLoading("Holdings Details")}</div>
        )}
        {holdingsData /* ... Holdings Table and Pie Chart ... */ && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2">
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-200">
                    Holdings Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full whitespace-nowrap rounded-md border border-slate-700 max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-slate-700/50">
                          <TableHead className="text-slate-400">
                            Symbol
                          </TableHead>
                          <TableHead className="text-slate-400 text-right">
                            Qty.
                          </TableHead>
                          <TableHead className="text-slate-400 text-right">
                            Avg. Price
                          </TableHead>
                          <TableHead className="text-slate-400 text-right">
                            LTP
                          </TableHead>
                          <TableHead className="text-slate-400 text-right">
                            Current Val.
                          </TableHead>
                          <TableHead className="text-slate-400 text-right">
                            P&L
                          </TableHead>
                          <TableHead className="text-slate-400 text-right">
                            P&L %
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holdingsData.holdings?.map((holding) => (
                          <TableRow
                            key={holding.isin || holding.symboltoken}
                            className="border-slate-700 hover:bg-slate-700/50"
                          >
                            <TableCell className="font-medium text-slate-100">
                              {holding.tradingsymbol}
                            </TableCell>
                            <TableCell className="text-right text-slate-300">
                              {holding.quantity}
                            </TableCell>
                            <TableCell className="text-right text-slate-300">
                              {holding.averageprice?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-slate-300">
                              {holding.ltp?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-slate-300">
                              {(holding.quantity * holding.ltp)?.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold ${
                                holding.profitandloss >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {holding.profitandloss?.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell
                              className={`text-right ${
                                holding.pnlpercentage >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {holding.pnlpercentage?.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {holdingsData.holdings?.length === 0 && (
                        <TableCaption className="py-10 text-slate-500">
                          You have no holdings.
                        </TableCaption>
                      )}
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-200">
                    Holdings Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] md:h-[400px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(30, 41, 59, 0.8)",
                            border: "1px solid #475569",
                            borderRadius: "0.375rem",
                            color: "#cbd5e1",
                          }}
                          formatter={(value: number) => [
                            `₹${value.toLocaleString("en-IN", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}`,
                            "Value",
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: "0.8rem",
                            paddingTop: "10px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      No data for chart.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
