"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Adjust path
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Adjust path
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // For table on small screens
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import { Terminal } from "lucide-react";
import { FullHoldingsResponse, HoldingItemData, PortfolioHoldingsData } from '@/lib/types';

// Basic Chart Component (using Recharts)
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_BASE_URL || 'http://localhost:8080';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function PortfolioPage() {
  const [holdingsData, setHoldingsData] = useState<PortfolioHoldingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false); // Ref to track if fetch has occurred

  useEffect(() => {
    const fetchHoldings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/portfolio/holdings`, {
          method: 'GET',
          credentials: 'include', // Send cookies
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}`}));
          throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
        }

        const result: FullHoldingsResponse = await response.json();

        if (result.status && result.data) {
          setHoldingsData(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch holdings data');
        }
      } catch (err) {
        console.error("Error fetching holdings:", err);
        setError(
          err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string"
            ? (err as Error).message
            : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!hasFetched.current) {
      fetchHoldings();
      hasFetched.current = true;
    }
  }, []);

  const chartData = useMemo(() => {
    if (!holdingsData?.holdings || holdingsData.holdings.length === 0) return [];
    return holdingsData.holdings.map(holding => ({
      name: holding.tradingsymbol,
      value: holding.quantity * holding.ltp, // Current value of this holding
    }));
  }, [holdingsData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-sky-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading portfolio holdings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-4">
        <Alert variant="destructive" className="w-full max-w-md bg-slate-800 border-red-700 text-red-300">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Portfolio</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!holdingsData || !holdingsData.totalholding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        No holdings data found.
      </div>
    );
  }

  const { holdings, totalholding } = holdingsData;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-sky-400 mb-8">Portfolio Holdings</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Investment</CardDescription>
              <CardTitle className="text-2xl text-sky-300">
                ₹{totalholding.totalinvvalue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-800 border-slate-700 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Current Value</CardDescription>
              <CardTitle className="text-2xl text-emerald-400">
                ₹{totalholding.totalholdingvalue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-800 border-slate-700 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Overall P&L</CardDescription>
              <CardTitle className={`text-2xl ${totalholding.totalprofitandloss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{totalholding.totalprofitandloss?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-slate-500 pt-1">
                ({totalholding.totalpnlpercentage?.toFixed(2)}%)
            </CardFooter>
          </Card>
          <Card className="bg-slate-800 border-slate-700 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Holdings</CardDescription>
              <CardTitle className="text-2xl text-slate-200">
                {holdings?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Holdings Table and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-slate-200">Holdings Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-700/50">
                        <TableHead className="text-slate-400">Symbol</TableHead>
                        <TableHead className="text-slate-400 text-right">Qty.</TableHead>
                        <TableHead className="text-slate-400 text-right">Avg. Price</TableHead>
                        <TableHead className="text-slate-400 text-right">LTP</TableHead>
                        <TableHead className="text-slate-400 text-right">Current Val.</TableHead>
                        <TableHead className="text-slate-400 text-right">P&L</TableHead>
                        <TableHead className="text-slate-400 text-right">P&L %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdings?.map((holding: HoldingItemData) => (
                        <TableRow key={holding.isin || holding.symboltoken} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="font-medium text-slate-100">{holding.tradingsymbol}</TableCell>
                          <TableCell className="text-right text-slate-300">{holding.quantity}</TableCell>
                          <TableCell className="text-right text-slate-300">
                            {holding.averageprice?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">
                            {holding.ltp?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">
                            {(holding.quantity * holding.ltp)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${holding.profitandloss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {holding.profitandloss?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={`text-right ${holding.pnlpercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {holding.pnlpercentage?.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                 {holdings?.length === 0 && (
                    <p className="text-center py-4 text-slate-500">No individual holdings to display.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-slate-200">Holdings Allocation</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] md:h-[400px]"> {/* Fixed height for chart container */}
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        // label={renderCustomizedLabel} // Can add custom labels
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #475569', borderRadius: '0.375rem', color: '#cbd5e1' }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, "Value"]}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }}/>
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
      </div>
    </div>
  );
}

// Optional: For custom labels on Pie chart slices
// const RADIAN = Math.PI / 180;
// const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
//   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
//   const x = cx + radius * Math.cos(-midAngle * RADIAN);
//   const y = cy + radius * Math.sin(-midAngle * RADIAN);

//   return (
//     <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem">
//       {`${name} (${(percent * 100).toFixed(0)}%)`}
//     </text>
//   );
// };