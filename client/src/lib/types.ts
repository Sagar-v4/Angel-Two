export type Exchange = "NSE" | "BSE";

export interface WatchlistItem {
  exchange: Exchange;
  token: string; // Token number as a string
}

export interface MarketLTPData {
  exchange: string;
  trading_symbol?: string; // Optional as Angel One LTP might not always return it
  symbol_token: string;
  ltp: number;
}

export interface LTPResponseData { // From your broker.proto
  fetched: MarketLTPData[];
  unfetched: {
    exchange: string;
    symbolToken: string;
    message: string;
    errorCode: string;
  }[];
}

export interface FullLTPResponse { // From your broker.proto
  status: boolean;
  message: string;
  errorcode: string;
  data: LTPResponseData | null; // data can be null
}

export interface TickerData extends MarketLTPData {
  previousLtp?: number;
  colorClass?: string; // For styling price changes
}