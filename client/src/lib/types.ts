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

export interface HoldingItemData {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  t1quantity: number;
  realisedquantity: number;
  quantity: number;
  authorisedquantity: number;
  product: string;
  collateralquantity: number | null; // Can be null, handle appropriately
  collateraltype: string | null;   // Can be null
  haircut: number;
  averageprice: number;
  ltp: number;
  symboltoken: string;
  close: number;
  profitandloss: number;
  pnlpercentage: number;
  // Add any other fields you expect or need from the HoldingItemData proto
}

export interface TotalHoldingValue {
  totalholdingvalue: number;
  totalinvvalue: number;
  totalprofitandloss: number;
  totalpnlpercentage: number;
}

export interface PortfolioHoldingsData {
  holdings: HoldingItemData[];
  totalholding: TotalHoldingValue;
}

export interface FullHoldingsResponse { // Matches GetHoldingsResponse from proto
  status: boolean;
  message: string;
  errorcode: string;
  data: PortfolioHoldingsData | null; // Data can be null if status is false
}

export interface AngelOneProfile { // Matches the "data" object in your profile response
  clientcode: string;
  name: string;
  email: string;
  mobileno: string;
  exchanges: string[]; // This is a string representing an array, e.g., "[ \"NSE\", ... ]"
  products: string[];  // This is also a string representing an array
  lastlogintime: string;
  brokerid: string; // From your example, it was "brokerid" not "broker"
}

export interface FullProfileResponse { // For the overall API response
  status: boolean;
  message: string;
  errorcode: string;
  data: AngelOneProfile | null;
}
