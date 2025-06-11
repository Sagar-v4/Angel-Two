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

export interface OrderBookItem {
  variety: string;
  ordertype: string;
  producttype: string;
  duration: string;
  price: number; 
  triggerprice: number; 
  quantity: string; // Angel sends as string "1"
  disclosedquantity: string;
  squareoff: number; 
  stoploss: number; 
  trailingstoploss: number; 
  tradingsymbol: string;
  transactiontype: string;
  exchange: string;
  symboltoken: string | null;
  instrumenttype: string;
  strikeprice: number; 
  optiontype: string;
  expirydate: string;
  lotsize: string;
  cancelsize: string;
  averageprice: number; 
  filledshares: string;
  unfilledshares: string;
  orderid: string;
  text: string;
  status: string;
  orderstatus: string;
  updatetime: string;
  exchtime: string;
  exchorderupdatetime: string;
  fillid: string;
  filltime: string;
  parentorderid: string;
  uniqueorderid: string;
  exchangeorderid: string;
  ordertag?: string; // Optional if it's not always there
}

export interface FullOrderBookResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: OrderBookItem[] | null; // Data can be null or an empty array
}
