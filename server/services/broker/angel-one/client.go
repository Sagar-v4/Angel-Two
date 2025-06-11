package angelone

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	pb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"
)

const (
	angelOneBaseURL        = "https://apiconnect.angelone.in/rest/secure/angelbroking"
	profileURLPath         = "/user/v1/getProfile"
	logoutURLPath          = "/user/v1/logout"
	placeOrderURLPath      = "/order/v1/placeOrder"
	cancelOrderURLPath     = "/order/v1/cancelOrder"
	orderBookURLPath       = "/order/v1/getOrderBook"
	holdingsURLPath        = "/portfolio/v1/getAllHolding"
	marketDataQuoteURLPath = "/market/v1/quote"
)

type Client struct {
	httpClient *http.Client
	apiKey     string
	userType   string
	sourceID   string
}

func NewClient(apiKey, userType, sourceID string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		apiKey:     apiKey,
		userType:   userType,
		sourceID:   sourceID,
	}
}

// Helper to set common headers for Angel One requests
func (c *Client) setCommonHeaders(req *http.Request, authToken, clientLocalIP, clientPublicIP, macAddress string) {
	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-UserType", c.userType)
	req.Header.Set("X-SourceID", c.sourceID)
	req.Header.Set("X-PrivateKey", c.apiKey) // This is your API key from config

	if clientLocalIP != "" {
		req.Header.Set("X-ClientLocalIP", clientLocalIP)
	}
	if clientPublicIP != "" {
		req.Header.Set("X-ClientPublicIP", clientPublicIP)
	}
	if macAddress != "" { // MAC address is often hard to get and might not be strictly required
		req.Header.Set("X-MACAddress", macAddress)
	}

	req.Header.Set("X-ClientLocalIP", "192.168.168.168")
	req.Header.Set("X-ClientPublicIP", "106.193.147.98")
	req.Header.Set("X-MACAddress", "fe80::216e:6507:4b90:3719")
}

// Helper for making requests and basic error/status handling
func (c *Client) doRequest(req *http.Request) (*http.Response, []byte, error) {
	log.Printf("AngelOne Client: Calling URL: %s, Method: %s", req.URL.String(), req.Method)
	res, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("AngelOne Client: HTTP request execution error: %v", err)
		return nil, nil, fmt.Errorf("HTTP request execution: %w", err)
	}
	defer res.Body.Close()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Printf("AngelOne Client: Error reading response body: %v", err)
		return res, nil, fmt.Errorf("reading response body: %w", err)
	}
	log.Printf("AngelOne Client: Raw response status: %s, body snippet: %100s...", res.Status, string(body))

	// No longer returning an error for non-200, as the caller will parse the AngelOne status/message from body.
	// if res.StatusCode != http.StatusOK {
	// 	log.Printf("AngelOne Client: API returned non-OK status: %d. Body: %s", res.StatusCode, string(body))
	// 	return res, body, fmt.Errorf("API returned status %s", res.Status)
	// }
	return res, body, nil
}

// AngelOneRawResponse matches the structure of the direct API call
type AngelOneRawResponse struct {
	Status    bool                    `json:"status"`
	Message   string                  `json:"message"`
	ErrorCode string                  `json:"errorcode"`
	Data      *pb.AngelOneProfileData `json:"data"` // Use the proto struct for direct unmarshalling
}

func (c *Client) GetUserProfile(authToken, clientLocalIP, clientPublicIP, macAddress string) (*pb.GetProfileResponse, error) {
	url := angelOneBaseURL + profileURLPath
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("AngelOne Client: Error creating request: %v", err)
		return nil, fmt.Errorf("creating request to Angel One: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-UserType", c.userType)
	req.Header.Set("X-SourceID", c.sourceID)
	req.Header.Set("X-PrivateKey", c.apiKey) // This is your API key

	// These might be tricky to get reliably or might not be strictly required by AngelOne always
	if clientLocalIP != "" {
		req.Header.Set("X-ClientLocalIP", clientLocalIP)
	}
	if clientPublicIP != "" {
		req.Header.Set("X-ClientPublicIP", clientPublicIP)
	}
	if macAddress != "" {
		req.Header.Set("X-MACAddress", macAddress)
	}
	req.Header.Set("X-ClientLocalIP", "192.168.168.168")
	req.Header.Set("X-ClientPublicIP", "106.193.147.98")
	req.Header.Set("X-MACAddress", "fe80::216e:6507:4b90:3719")

	log.Printf("AngelOne Client: Calling GetProfile with Authorization: Bearer %.10s...", authToken)
	res, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("AngelOne Client: Error calling Angel One API: %v", err)
		return nil, fmt.Errorf("calling Angel One GetProfile API: %w", err)
	}
	defer res.Body.Close()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Printf("AngelOne Client: Error reading response body: %v", err)
		return nil, fmt.Errorf("reading Angel One response body: %w", err)
	}

	log.Printf("AngelOne Client: Raw response status: %s, body: %s", res.Status, string(body))

	if res.StatusCode != http.StatusOK {
		log.Printf("AngelOne Client: API returned non-OK status: %d. Body: %s", res.StatusCode, string(body))
		// Attempt to parse error response if possible
		var errorResp AngelOneRawResponse
		json.Unmarshal(body, &errorResp) // Try to unmarshal, ignore error if it fails
		return &pb.GetProfileResponse{
			Status:    false,
			Message:   fmt.Sprintf("Angel One API Error: %s", res.Status),
			Errorcode: errorResp.ErrorCode, // Will be empty if unmarshal failed or not present
			Data:      nil,
		}, nil // Return a structured error within the gRPC response
	}

	var apiResponse AngelOneRawResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client: Error unmarshalling Angel One response: %v. Body: %s", err, string(body))
		return nil, fmt.Errorf("unmarshalling Angel One response: %w", err)
	}

	return &pb.GetProfileResponse{
		Status:    apiResponse.Status,
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      apiResponse.Data,
	}, nil
}

type AngelOneGenericResponse struct {
	Status    bool        `json:"status"`
	Message   string      `json:"message"`
	ErrorCode string      `json:"errorcode"`
	Data      interface{} `json:"data,omitempty"` // Logout might not have a complex data field
}

func (c *Client) LogoutUser(authToken, clientCode, clientLocalIP, clientPublicIP, macAddress string) (*pb.LogoutResponse, error) {
	payloadBody := map[string]string{
		"clientcode": clientCode,
	}
	payloadBytes, err := json.Marshal(payloadBody)
	if err != nil {
		log.Printf("AngelOne Client: Error marshalling logout payload: %v", err)
		return nil, fmt.Errorf("marshalling logout payload: %w", err)
	}

	req, err := http.NewRequest("POST", logoutURLPath, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("AngelOne Client: Error creating logout request: %v", err)
		return nil, fmt.Errorf("creating logout request to Angel One: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-UserType", c.userType)
	req.Header.Set("X-SourceID", c.sourceID)
	req.Header.Set("X-PrivateKey", c.apiKey)

	if clientLocalIP != "" {
		req.Header.Set("X-ClientLocalIP", clientLocalIP)
	}
	if clientPublicIP != "" {
		req.Header.Set("X-ClientPublicIP", clientPublicIP)
	}
	if macAddress != "" {
		req.Header.Set("X-MACAddress", macAddress)
	}

	log.Printf("AngelOne Client: Calling Logout for clientCode: %s with Authorization: Bearer %.10s...", clientCode, authToken)
	res, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("AngelOne Client: Error calling Angel One Logout API: %v", err)
		return nil, fmt.Errorf("calling Angel One Logout API: %w", err)
	}
	defer res.Body.Close()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Printf("AngelOne Client: Error reading logout response body: %v", err)
		return nil, fmt.Errorf("reading Angel One logout response body: %w", err)
	}
	log.Printf("AngelOne Client: Logout Raw response status: %s, body: %s", res.Status, string(body))

	// Even if AngelOne returns non-200, we try to parse their standard error structure
	var apiResponse AngelOneGenericResponse // Using generic response struct
	if errUnmarshal := json.Unmarshal(body, &apiResponse); errUnmarshal != nil {
		// If unmarshalling fails, it means AngelOne returned something unexpected.
		// We still use the HTTP status to determine overall success for our LogoutResponse.
		log.Printf("AngelOne Client: Error unmarshalling Angel One logout response: %v. Body: %s", errUnmarshal, string(body))
		if res.StatusCode == http.StatusOK { // This case is unlikely if unmarshal fails but HTTP is OK
			return &pb.LogoutResponse{Status: false, Message: "Successfully called Angel One, but response unmarshal failed", Errorcode: "UNMARSHAL_ERROR"}, nil
		}
		return &pb.LogoutResponse{Status: false, Message: fmt.Sprintf("Angel One API Error: %s (and unmarshal failed)", res.Status), Errorcode: "HTTP_ERROR_AND_UNMARSHAL_ERROR"}, nil
	}

	// If unmarshalling succeeded, use the status from the JSON body if HTTP status was OK.
	// Otherwise, prioritize HTTP status for failure.
	finalStatus := apiResponse.Status
	if res.StatusCode != http.StatusOK {
		finalStatus = false // If HTTP status is not OK, overall operation is not a success
	}

	return &pb.LogoutResponse{
		Status:    finalStatus,
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
	}, nil
}

// --- Place Order ---
// Request structure for Angel One Place Order API
type AngelPlaceOrderPayload struct {
	Variety         string  `json:"variety"`
	TradingSymbol   string  `json:"tradingsymbol"`
	SymbolToken     string  `json:"symboltoken"`
	TransactionType string  `json:"transactiontype"`
	Exchange        string  `json:"exchange"`
	OrderType       string  `json:"ordertype"`
	ProductType     string  `json:"producttype"`
	Duration        string  `json:"duration"`
	Price           float64 `json:"price,omitempty"` // omitempty if 0 is not a valid price for market orders
	SquareOff       float64 `json:"squareoff,omitempty"`
	StopLoss        float64 `json:"stoploss,omitempty"`
	Quantity        int32   `json:"quantity"`
	// Add other optional fields here with `json:",omitempty"`
}

// Response structure (data part) for Angel One Place Order
type AngelPlaceOrderDataResponse struct {
	Script  string `json:"script"`
	OrderID string `json:"orderid"`
}
type AngelPlaceOrderRawResponse struct {
	Status    bool                         `json:"status"`
	Message   string                       `json:"message"`
	ErrorCode string                       `json:"errorcode"`
	Data      *AngelPlaceOrderDataResponse `json:"data"`
}

func (c *Client) PlaceOrder(reqData *pb.PlaceOrderRequest) (*pb.PlaceOrderResponse, error) {
	url := angelOneBaseURL + placeOrderURLPath
	payload := AngelPlaceOrderPayload{
		Variety:         reqData.Variety,
		TradingSymbol:   reqData.Tradingsymbol,
		SymbolToken:     reqData.Symboltoken,
		TransactionType: reqData.Transactiontype,
		Exchange:        reqData.Exchange,
		OrderType:       reqData.Ordertype,
		ProductType:     reqData.Producttype,
		Duration:        reqData.Duration,
		Price:           reqData.Price,
		SquareOff:       reqData.Squareoff,
		StopLoss:        reqData.Stoploss,
		Quantity:        reqData.Quantity,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshalling place order payload: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("creating place order request: %w", err)
	}
	c.setCommonHeaders(httpReq, reqData.AngelOneJwt, reqData.ClientLocalIp, reqData.ClientPublicIp, reqData.MacAddress)

	_, body, err := c.doRequest(httpReq)
	if err != nil {
		return nil, err
	} // doRequest handles logging

	var apiResponse AngelPlaceOrderRawResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client (PlaceOrder): Error unmarshalling response: %v. Body: %s", err, string(body))
		return &pb.PlaceOrderResponse{Status: false, Message: "Failed to parse Angel One response", Errorcode: "UNMARSHAL_ERROR"}, nil
	}

	var pbData *pb.PlaceOrderAngelData
	if apiResponse.Data != nil {
		pbData = &pb.PlaceOrderAngelData{
			Script:  apiResponse.Data.Script,
			Orderid: apiResponse.Data.OrderID,
		}
	}

	return &pb.PlaceOrderResponse{
		Status:    apiResponse.Status,
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      pbData,
	}, nil
}

// --- Cancel Order ---
type AngelCancelOrderPayload struct {
	Variety string `json:"variety"`
	OrderID string `json:"orderid"`
}
type AngelCancelOrderDataResponse struct {
	OrderID string `json:"orderid"`
}
type AngelCancelOrderRawResponse struct {
	Status    bool                          `json:"status"`
	Message   string                        `json:"message"`
	ErrorCode string                        `json:"errorcode"`
	Data      *AngelCancelOrderDataResponse `json:"data"`
}

func (c *Client) CancelOrder(reqData *pb.CancelOrderRequest) (*pb.CancelOrderResponse, error) {
	url := angelOneBaseURL + cancelOrderURLPath
	payload := AngelCancelOrderPayload{
		Variety: reqData.Variety,
		OrderID: reqData.Orderid,
	}
	payloadBytes, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	c.setCommonHeaders(httpReq, reqData.AngelOneJwt, reqData.ClientLocalIp, reqData.ClientPublicIp, reqData.MacAddress)

	_, body, err := c.doRequest(httpReq)
	if err != nil {
		return nil, err
	}

	var apiResponse AngelCancelOrderRawResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client (CancelOrder): Error unmarshalling response: %v. Body: %s", err, string(body))
		return &pb.CancelOrderResponse{Status: false, Message: "Failed to parse Angel One response", Errorcode: "UNMARSHAL_ERROR"}, nil
	}
	var pbData *pb.CancelOrderAngelData
	if apiResponse.Data != nil {
		pbData = &pb.CancelOrderAngelData{Orderid: apiResponse.Data.OrderID}
	}
	return &pb.CancelOrderResponse{
		Status:    apiResponse.Status,
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      pbData,
	}, nil
}

// --- Get Order Book ---
// This struct matches Angel One's JSON structure for individual order items
type AngelOneOrderBookRawResponse struct {
	Status    bool                `json:"status"`
	Message   string              `json:"message"`
	ErrorCode string              `json:"errorcode"`
	Data      []*pb.OrderBookItem `json:"data"` // <<< CHANGED to use the intermediate struct
}

func (c *Client) GetOrderBook(reqData *pb.GetOrderBookRequest) (*pb.GetOrderBookResponse, error) {
	url := angelOneBaseURL + orderBookURLPath
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return &pb.GetOrderBookResponse{Status: false, Message: "Failed to create getOrderBook request", Errorcode: "REQUEST_CREATION_ERROR"}, nil
	}

	c.setCommonHeaders(httpReq, reqData.AngelOneJwt, reqData.ClientLocalIp, reqData.ClientPublicIp, reqData.MacAddress)

	res, body, err := c.doRequest(httpReq)
	if err != nil {
		if res != nil {
			res.Body.Close()
		}
		return &pb.GetOrderBookResponse{Status: false, Message: "Failed to execute request to Angel One: " + err.Error(), Errorcode: "HTTP_EXECUTION_ERROR"}, nil
	}
	defer res.Body.Close()

	var apiResponse AngelOneOrderBookRawResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client (GetOrderBook): Error unmarshalling response: %v. Body: %s", err, string(body))
		msg := "Failed to parse Angel One order book response"
		if res.StatusCode != http.StatusOK {
			msg = fmt.Sprintf("Angel One API Error: %s (and failed to parse body)", res.Status)
		}
		return &pb.GetOrderBookResponse{Status: false, Message: msg, Errorcode: "UNMARSHAL_ERROR"}, nil
	}

	// If Angel One itself reports a failure status in its JSON, reflect that.
	// Even if data is null, status can be true.
	if !apiResponse.Status {
		log.Printf("AngelOne Client (GetOrderBook): Angel One API reported status:false. Message: %s, ErrorCode: %s", apiResponse.Message, apiResponse.ErrorCode)
		// Still attempt to map Data if it exists (e.g. for unfetched items info, though order book doesn't have that structure)
		var mappedData []*pb.OrderBookItem
		if apiResponse.Data != nil { // Check if Data is not nil before trying to map
			mappedData = make([]*pb.OrderBookItem, 0, len(apiResponse.Data)) // Initialize for safety
			// Potentially map even on failure if some partial data is useful or expected
		}
		return &pb.GetOrderBookResponse{
			Status:    false,
			Message:   apiResponse.Message,
			Errorcode: apiResponse.ErrorCode,
			Data:      mappedData,
		}, nil
	}

	return &pb.GetOrderBookResponse{
		Status:    apiResponse.Status, // Should be true if we reach here
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      apiResponse.Data,
	}, nil
}

// --- Get Holdings ---
type AngelHoldingsRawResponse struct {
	Status    bool                      `json:"status"`
	Message   string                    `json:"message"`
	ErrorCode string                    `json:"errorcode"`
	Data      *pb.PortfolioHoldingsData `json:"data"` // <<< CHANGED to use the wrapper type
}

func (c *Client) GetHoldings(reqData *pb.GetHoldingsRequest) (*pb.GetHoldingsResponse, error) {
	url := angelOneBaseURL + holdingsURLPath
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return &pb.GetHoldingsResponse{Status: false, Message: "Failed to create holdings request", Errorcode: "REQUEST_ERROR"}, nil
	}

	c.setCommonHeaders(httpReq, reqData.AngelOneJwt, reqData.ClientLocalIp, reqData.ClientPublicIp, reqData.MacAddress)

	res, body, err := c.doRequest(httpReq)
	if err != nil {
		if res != nil {
			res.Body.Close()
		}
		// If doRequest itself had an error (network, etc.), create a response indicating that.
		return &pb.GetHoldingsResponse{Status: false, Message: "Failed to execute request to Angel One: " + err.Error(), Errorcode: "HTTP_EXECUTION_ERROR"}, nil
	}
	defer res.Body.Close()

	var apiResponse AngelHoldingsRawResponse // This will now unmarshal into the correct structure
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client (GetHoldings): Error unmarshalling Angel One response: %v. Body: %s", err, string(body))
		msg := "Failed to parse Angel One response"
		if res.StatusCode != http.StatusOK {
			msg = fmt.Sprintf("Angel One API Error: %s (and failed to parse body)", res.Status)
		}
		return &pb.GetHoldingsResponse{Status: false, Message: msg, Errorcode: "UNMARSHAL_ERROR"}, nil
	}

	// If Angel One itself reports a failure status in its JSON, reflect that.
	if !apiResponse.Status {
		log.Printf("AngelOne Client (GetHoldings): Angel One API reported status:false. Message: %s, ErrorCode: %s", apiResponse.Message, apiResponse.ErrorCode)
		return &pb.GetHoldingsResponse{
			Status:    false, // Reflect Angel One's status
			Message:   apiResponse.Message,
			Errorcode: apiResponse.ErrorCode,
			Data:      nil, // No data if Angel One reported failure
		}, nil
	}

	// If everything is fine, return the successfully parsed data.
	return &pb.GetHoldingsResponse{
		Status:    apiResponse.Status,
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      apiResponse.Data, // apiResponse.Data is now *pb.PortfolioHoldingsData
	}, nil
}

// --- Market Data ---

// Request payload for Angel One's market data (LTP and Full Quote use similar request structure)
type AngelMarketDataPayload struct {
	Mode           string              `json:"mode"` // "LTP" or "FULL" (or "OHLC" for Angel's FULL)
	ExchangeTokens map[string][]string `json:"exchangeTokens"`
}

// --- GetLTP ---
type AngelLTPDataInternal struct { // Use this for unmarshalling the direct Angel One response
	Exchange      string  `json:"exchange"`
	TradingSymbol string  `json:"tradingSymbol"`
	SymbolToken   string  `json:"symbolToken"`
	Ltp           float64 `json:"ltp"`
}

type AngelLTPFetchedUnfetchedData struct {
	Fetched   []AngelLTPDataInternal `json:"fetched"`   // Unmarshal into this internal struct
	Unfetched []*pb.UnfetchedItem    `json:"unfetched"` // This can stay as pb.UnfetchedItem if its fields match
}

type AngelLTPRawResponse struct {
	Status    bool                          `json:"status"`
	Message   string                        `json:"message"`
	ErrorCode string                        `json:"errorcode"`
	Data      *AngelLTPFetchedUnfetchedData `json:"data"` // Changed to use the internal struct for 'fetched'
}

func (c *Client) GetLTP(reqData *pb.GetLTPRequest) (*pb.GetLTPResponse, error) {
	url := angelOneBaseURL + marketDataQuoteURLPath
	// ... (payload creation and httpReq setup, setCommonHeaders) ...
	// ... as before ...
	exchangeTokensMap := make(map[string][]string)
	for _, pair := range reqData.ExchangeTokens {
		exchangeTokensMap[pair.Exchange] = pair.Tokens
	}
	payload := AngelMarketDataPayload{ // Assuming AngelMarketDataPayload is defined elsewhere correctly
		Mode:           "LTP",
		ExchangeTokens: exchangeTokensMap,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return &pb.GetLTPResponse{Status: false, Message: "Failed to marshal LTP payload: " + err.Error()}, nil
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return &pb.GetLTPResponse{Status: false, Message: "Failed to create LTP request: " + err.Error()}, nil
	}
	c.setCommonHeaders(httpReq, reqData.AngelOneJwt, reqData.ClientLocalIp, reqData.ClientPublicIp, reqData.MacAddress)

	res, body, err := c.doRequest(httpReq)
	if err != nil {
		if res != nil {
			res.Body.Close()
		}
		return &pb.GetLTPResponse{Status: false, Message: "Failed to execute LTP request to Angel One: " + err.Error(), Errorcode: "HTTP_EXECUTION_ERROR"}, nil
	}
	defer res.Body.Close()

	var apiResponse AngelLTPRawResponse // This uses AngelLTPFetchedUnfetchedData for its Data.Fetched field
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client (GetLTP): Error unmarshalling: %v. Body: %s", err, string(body))
		msg := "Failed to parse Angel One LTP response"
		if res.StatusCode != http.StatusOK {
			msg = fmt.Sprintf("Angel One API Error: %s (and failed to parse body)", res.Status)
		}
		return &pb.GetLTPResponse{Status: false, Message: msg, Errorcode: "UNMARSHAL_ERROR"}, nil
	}

	// Check Angel One's own status field
	if !apiResponse.Status {
		log.Printf("AngelOne Client (GetLTP): Angel One API reported status:false. Message: %s, ErrorCode: %s", apiResponse.Message, apiResponse.ErrorCode)
		// Even if status is false, Data might contain unfetched items.
		var pbDataToReturn *pb.GetLTPResponse_LTPResponseData
		if apiResponse.Data != nil {
			pbDataToReturn = &pb.GetLTPResponse_LTPResponseData{
				Fetched:   []*pb.LTPData{}, // Empty if Angel status is false but data field exists
				Unfetched: apiResponse.Data.Unfetched,
			}
		}
		return &pb.GetLTPResponse{
			Status:    false,
			Message:   apiResponse.Message,
			Errorcode: apiResponse.ErrorCode,
			Data:      pbDataToReturn,
		}, nil
	}

	var pbLTPResponseData *pb.GetLTPResponse_LTPResponseData
	if apiResponse.Data != nil {
		// Manually map from AngelLTPDataInternal to pb.LTPData
		fetchedPbData := make([]*pb.LTPData, len(apiResponse.Data.Fetched))
		for i, internalItem := range apiResponse.Data.Fetched {
			fetchedPbData[i] = &pb.LTPData{
				Exchange:      internalItem.Exchange,
				TradingSymbol: internalItem.TradingSymbol, // <<< Ensure mapping
				SymbolToken:   internalItem.SymbolToken,   // <<< Ensure mapping
				Ltp:           internalItem.Ltp,
			}
		}

		pbLTPResponseData = &pb.GetLTPResponse_LTPResponseData{
			Fetched:   fetchedPbData,              // Use the mapped data
			Unfetched: apiResponse.Data.Unfetched, // Assuming UnfetchedItem fields match proto
		}
	}

	return &pb.GetLTPResponse{
		Status:    apiResponse.Status, // Should be true if we reach here
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      pbLTPResponseData,
	}, nil
}

// --- GetFullQuote ---
// Response structure for Angel One GetFullQuote API (maps to /quote/ endpoint)
type AngelFullQuoteDataResponse struct { // This is the "data" object
	Fetched   []*pb.FullQuoteData `json:"fetched"`
	Unfetched []*pb.UnfetchedItem `json:"unfetched"`
}
type AngelFullQuoteRawResponse struct {
	Status    bool                        `json:"status"`
	Message   string                      `json:"message"`
	ErrorCode string                      `json:"errorcode"`
	Data      *AngelFullQuoteDataResponse `json:"data"`
}

func (c *Client) GetFullQuote(reqData *pb.GetFullQuoteRequest) (*pb.GetFullQuoteResponse, error) {
	url := angelOneBaseURL + marketDataQuoteURLPath // Using the /quote/ endpoint URL
	exchangeTokensMap := make(map[string][]string)
	for _, pair := range reqData.ExchangeTokens {
		exchangeTokensMap[pair.Exchange] = pair.Tokens
	}
	payload := AngelMarketDataPayload{
		Mode:           "FULL", // Angel One specific mode string for this endpoint
		ExchangeTokens: exchangeTokensMap,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshalling GetFullQuote payload: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("creating GetFullQuote request: %w", err)
	}
	c.setCommonHeaders(httpReq, reqData.AngelOneJwt, reqData.ClientLocalIp, reqData.ClientPublicIp, reqData.MacAddress)

	res, body, err := c.doRequest(httpReq)
	if err != nil {
		if res != nil {
			res.Body.Close()
		}
		return &pb.GetFullQuoteResponse{Status: false, Message: "Failed to execute FullQuote request to Angel One: " + err.Error(), Errorcode: "HTTP_EXECUTION_ERROR"}, nil
	}
	defer res.Body.Close()

	var apiResponse AngelFullQuoteRawResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("AngelOne Client (GetFullQuote): Error unmarshalling: %v. Body: %s", err, string(body))
		msg := "Failed to parse Angel One FullQuote response"
		if res.StatusCode != http.StatusOK {
			msg = fmt.Sprintf("Angel One API Error: %s (and failed to parse body)", res.Status)
		}
		return &pb.GetFullQuoteResponse{Status: false, Message: msg, Errorcode: "UNMARSHAL_ERROR"}, nil
	}

	var pbFullQuoteResponseData *pb.GetFullQuoteResponse_FullQuoteResponseData
	if apiResponse.Data != nil {
		pbFullQuoteResponseData = &pb.GetFullQuoteResponse_FullQuoteResponseData{
			Fetched:   apiResponse.Data.Fetched,
			Unfetched: apiResponse.Data.Unfetched,
		}
	}

	return &pb.GetFullQuoteResponse{
		Status:    apiResponse.Status,
		Message:   apiResponse.Message,
		Errorcode: apiResponse.ErrorCode,
		Data:      pbFullQuoteResponseData,
	}, nil
}
