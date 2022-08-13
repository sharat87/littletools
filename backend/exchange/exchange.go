package exchange

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sharat87/littletools/config"
	"github.com/sharat87/littletools/httpclient"
	"github.com/sharat87/littletools/utils"
	"log"
	"net/http"
)

type Exchange struct {
	Request        http.Request
	ResponseWriter http.ResponseWriter
	Fields         map[string]string
	Config         config.Config
	HTTPClient     httpclient.HTTPClient
}

func (ex Exchange) DecodeBody(data any) error {
	d := json.NewDecoder(ex.Request.Body)
	d.DisallowUnknownFields()
	return d.Decode(&data)
}

func (ex Exchange) Respond(statusCode int, data any) {
	ex.ResponseWriter.WriteHeader(statusCode)
	ex.ResponseWriter.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(ex.ResponseWriter).Encode(data)
	if err != nil {
		log.Printf("Error writing JSON response: %v", err)
		_, _ = ex.ResponseWriter.Write([]byte(fmt.Sprintf(`{"error": %q}`, err)))
		return
	}
}

func (ex Exchange) RespondErrorDeprecated(statusCode int, err error) {
	ex.Respond(statusCode, map[string]any{
		"error": err.Error(),
	})
}

func (ex Exchange) RespondError(statusCode int, code, message string) {
	ex.Respond(statusCode, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func (ex Exchange) RequireMethod(method string) error {
	if ex.Request.Method != method {
		err := errors.New(fmt.Sprintf("Invalid method %v", ex.Request.Method))
		ex.RespondErrorDeprecated(http.StatusMethodNotAllowed, err)
		return err
	}
	return nil
}

func (ex Exchange) HTTPDo(request httpclient.Request) (*httpclient.Response, error) {
	return ex.HTTPClient.Do(request)
}

func (ex Exchange) IsAddressAllowedForProxy(address string) bool {
	return utils.IsAddressAllowed(address, ex.Config.ProxyDisallowedHosts, ex.Config.ProxyDisallowedPrefixes)
}
