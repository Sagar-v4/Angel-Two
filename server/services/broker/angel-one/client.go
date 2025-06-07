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

const angelOneProfileURL = "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile"
const angelOneLogoutURL = "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/logout"

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

// AngelOneRawResponse matches the structure of the direct API call
type AngelOneRawResponse struct {
	Status    bool                    `json:"status"`
	Message   string                  `json:"message"`
	ErrorCode string                  `json:"errorcode"`
	Data      *pb.AngelOneProfileData `json:"data"` // Use the proto struct for direct unmarshalling
}

func (c *Client) GetUserProfile(authToken, clientLocalIP, clientPublicIP, macAddress string) (*pb.GetProfileResponse, error) {
	req, err := http.NewRequest("GET", angelOneProfileURL, nil)
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
	// req.Header.Set("X-ClientLocalIP", "192.168.168.168")
	// req.Header.Set("X-ClientPublicIP", "106.193.147.98")
	// req.Header.Set("X-MACAddress", "fe80::216e:6507:4b90:3719")

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

	req, err := http.NewRequest("POST", angelOneLogoutURL, bytes.NewBuffer(payloadBytes))
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
