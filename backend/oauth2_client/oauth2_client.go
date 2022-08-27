package oauth2_client

import (
	"encoding/base64"
	"encoding/json"
	"github.com/sharat87/littletools/exchange"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"time"
)

// TODO: When the query param changes, the UI doesn't reflect that.

func HandleOAuth2ClientStart(ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodPost) != nil {
		return
	}

	err := ex.Request.ParseForm()
	if err != nil {
		ex.RespondError(http.StatusBadRequest, "error-parsing-body", "Error parsing body "+err.Error())
		return
	}

	authorizeURL := ex.Request.Form["authorizeURL"][0]
	u, err := url.Parse(authorizeURL)
	if err != nil {
		ex.RespondError(http.StatusBadRequest, "error-parsing-authorizeURL", "Error parsing authorizeURL "+err.Error())
		return
	}

	clientID := ex.Request.Form["client_id"][0]
	redirectURI := ex.Request.Form["redirect_uri"][0]

	q := u.Query()
	q.Set("response_type", "code")
	q.Set("client_id", clientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("scope", ex.Request.Form["scope"][0])

	state, err := base64EncodedJSON(map[string]any{
		"state":        ex.Request.Form["state"][0],
		"authorizeURL": authorizeURL,
		"tokenURL":     ex.Request.Form["token_url"][0],
		"clientID":     clientID,
		"clientSecret": ex.Request.Form["client_secret"][0],
		"redirectURI":  redirectURI,
	})
	if err != nil {
		ex.RespondError(http.StatusBadRequest, "error-encoding-state", "Error encoding state "+err.Error())
		return
	}
	q.Set("state", state)

	u.RawQuery = q.Encode()

	ex.Redirect(u.String())

}

// HandleOAuth2ClientVerify handles OAuth2 Server redirection with a `code`, if approved.
func HandleOAuth2ClientVerify(ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodGet) != nil {
		return
	}

	log.Printf("HandleOAuth2ClientVerify URL %+v", ex.Request.URL)

	code, err := ex.QueryParamSingle("code")
	if err != nil {
		ex.RespondError(http.StatusBadRequest, "missing-code", "Missing code "+err.Error())
		return
	}

	stateStr, err := ex.QueryParamSingle("state")
	if err != nil {
		ex.RespondError(http.StatusBadRequest, "missing-state", "Missing state "+err.Error())
		return
	}

	scope, err := ex.QueryParamSingle("scope")
	if err != nil {
		scope = ""
	}

	to, err := url.Parse(ex.Request.URL.String())
	if err != nil {
		log.Printf("Error parsing parsed URL!!! %v", err)
		return
	}

	to.Path = "/oauth2"

	state, err := base64DecodedJSON(stateStr)
	if err != nil {
		log.Printf("Error decoding state %v", err)
		return
	}

	tokenUrl, ok := state["tokenURL"].(string)
	var tokenResponse, tokenResponseContentType string
	if ok {
		u, err := url.Parse(tokenUrl)
		if err != nil {
			log.Printf("Error parsing token URL %v", err)
			return
		}
		q := u.Query()
		q.Set("code", code)
		q.Set("client_id", state["clientID"].(string))
		q.Set("client_secret", state["clientSecret"].(string))
		q.Set("redirect_uri", state["redirectURI"].(string))
		u.RawQuery = q.Encode()
		resp, err := http.DefaultClient.Do(&http.Request{
			Method: http.MethodPost,
			URL:    u,
		})
		if err != nil {
			log.Printf("Error executing request for token URL %v", err)
			return
		}
		defer resp.Body.Close()
		tokenResponseContentType = resp.Header.Get("Content-Type")
		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Error reading response from token URL %v", err)
			return
		}
		tokenResponse = string(body)
	}

	// TODO: Hit the token URL, if given, and include that response here as well.
	data, err := base64EncodedJSON(map[string]any{
		"view": "result",
		"time": time.Now().UTC(),
		"authorizeResponse": map[string]any{
			"code":  code,
			"scope": scope,
		},
		"tokenResponse": map[string]any{
			"body":        tokenResponse,
			"contentType": tokenResponseContentType,
		},
		"state": state,
	})
	if err != nil {
		log.Printf("Error encoding result JSON!!! %v", err)
		return
	}

	to.RawQuery = data
	ex.Redirect(to.String())
}

func base64EncodedJSON(data map[string]any) (string, error) {
	b, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func base64DecodedJSON(data string) (map[string]any, error) {
	b, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return nil, err
	}
	var m map[string]any
	err = json.Unmarshal(b, &m)
	if err != nil {
		return nil, err
	}
	return m, nil
}
