package mux

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/sharat87/littletools/assets"
	"github.com/sharat87/littletools/config"
	"github.com/sharat87/littletools/exchange"
	"github.com/sharat87/littletools/httpclient"
	"github.com/sharat87/littletools/oauth2_client"
	"github.com/sharat87/littletools/send_mail"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

type Mux struct {
	Routes     []Route
	Config     config.Config
	HTTPClient httpclient.HTTPClient
}

type Route struct {
	Pattern regexp.Regexp
	Fn      HandlerFn
}

type HandlerFn func(ex *exchange.Exchange)

func New() *Mux {
	m := &Mux{}

	m.Route(`/x/send-mail`, send_mail.HandleSendMail)

	m.Route(`/x/oauth2-client-start`, oauth2_client.HandleOAuth2ClientStart)
	m.Route(`/x/oauth2-client-verify`, oauth2_client.HandleOAuth2ClientVerify)

	// Flow: <https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth>.
	m.Route(`/oidc/authorize`, HandleOIDCAuthorize) // user opens this in their browser, to approve/deny
	m.Route(`/oidc/token`, HandleOIDCToken)         // client app calls this API to get an access token

	return m
}

func HandleOIDCAuthorize(ex *exchange.Exchange) {
	log.Printf("request %+v", ex)
	if ex.Request.Method == http.MethodGet {
		ex.ResponseWriter.Header().Set("Content-Type", "text/html")

		redirectURI, err := ex.QueryParamSingle("redirect_uri")
		if err != nil {
			ex.RespondError(http.StatusBadRequest, "invalid-request", "Missing redirect_uri.")
			return
		}

		state, err := ex.QueryParamSingle("state")
		if err != nil {
			ex.RespondError(http.StatusBadRequest, "invalid-request", "Missing state.")
			return
		}

		nonce, err := ex.QueryParamSingle("nonce")
		if err != nil {
			ex.RespondError(http.StatusBadRequest, "invalid-request", "Missing nonce.")
			return
		}

		_, err = ex.ResponseWriter.Write([]byte(fmt.Sprintf(`<!DOCTYPE html>
<html lang=en>
  <head>
  </head>
  <body>
      <form action=/oidc/authorize method=POST>
		<p>Redirect URI: <code>%s</code></p>
		<input name=redirect_uri id=redirect_uri value=%q>
		<input name=code id=code value=dummy-auth-code>
		<input name=state id=state value=%q>
		<input name=nonce id=nonce value=%q>
		<input type=submit name=choice value=approve>
      </form>
`, redirectURI, redirectURI, state, nonce)))

		if err != nil {
			log.Printf("Error writing responre %v", err)
		}

	} else if ex.Request.Method == http.MethodPost {
		err := ex.Request.ParseForm()
		if err != nil {
			log.Printf("Error parsing form data %v", err)
			return
		}

		u, err := url.Parse(ex.Request.Form["redirect_uri"][0])
		if err != nil {
			log.Printf("Error parsing redirect_url %v", err)
			return
		}

		q := u.Query()
		q.Set("code", ex.Request.Form["code"][0])
		q.Set("state", ex.Request.Form["state"][0])
		u.RawQuery = q.Encode()

		ex.Redirect(u.String())

	} else {
		ex.RespondError(http.StatusMethodNotAllowed, "method-not-allowed", "Method not allowed.")

	}
}

func HandleOIDCToken(ex *exchange.Exchange) {
	log.Printf("request %+v", ex)

	err := ex.Request.ParseForm()
	if err != nil {
		log.Printf("Error parsing form data %v", err)
		return
	}

	log.Printf("form data %+v", ex.Request.Form)

	// Incoming Authorization header = "Basic <base64 encoded client_id:client_secret>"
	ex.ResponseWriter.Header().Set("Cache-Control", "no-store")
	ex.ResponseWriter.Header().Set("Pragma", "no-cache")

	jwt, err := makeJWT(map[string]any{
		"username": "sherlock",
	})
	if err != nil {
		log.Printf("Error making JWT: %v", err)
		return
	}
	log.Printf("JWT: %s", jwt)

	ex.Respond(http.StatusOK, map[string]any{
		"id_token":      jwt, // this is the jwt
		"access_token":  "some access token",
		"token_type":    "Bearer",
		"refresh_token": "some refresh token",
		"expires_in":    3600,
	})
}

func makeJWT(payloadData map[string]any) (string, error) {
	headerBytes, err := json.Marshal(map[string]any{
		"typ": "JWT",
		"alg": "RS256",
		"kid": "some-key-id", // Key ID
	})
	if err != nil {
		return "", err
	}

	payloadBytes, err := json.Marshal(payloadData)
	if err != nil {
		return "", err
	}

	header := base64.RawURLEncoding.EncodeToString(headerBytes)
	payload := base64.RawURLEncoding.EncodeToString(payloadBytes)

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", err
	}
	log.Printf("key: %+v", key)

	//checksum := sha256.Sum256([]byte(header + "." + payload))
	hasher := crypto.SHA256.New()
	hasher.Write([]byte(header + "." + payload))

	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, hasher.Sum(nil))
	if err != nil {
		return "", err
	}

	return header + "." + payload + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func (mux *Mux) UseConfig(cfg config.Config) {
	mux.Config = cfg
}

func (mux *Mux) UseHTTPClient(client httpclient.HTTPClient) {
	mux.HTTPClient = client
}

func (mux *Mux) Route(pattern string, fn HandlerFn) {
	mux.Routes = append(mux.Routes, Route{
		Pattern: *regexp.MustCompile("^" + pattern + "$"),
		Fn:      fn,
	})
}

func (mux *Mux) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if req.RequestURI == "*" {
		if req.ProtoAtLeast(1, 1) {
			w.Header().Set("Connection", "close")
		}
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	ex := &exchange.Exchange{
		Request:        *req,
		ResponseWriter: w,
		Fields:         make(map[string]string),
		Config:         mux.Config,
		HTTPClient:     mux.HTTPClient,
	}

	var route Route
	var match []string
	for _, route = range mux.Routes {
		match = route.Pattern.FindStringSubmatch(req.URL.Path)
		if match != nil {
			break
		}
	}

	if match == nil {
		if ex.Request.Method == http.MethodGet && !strings.HasPrefix(req.URL.Path, "/x/") {
			assets.HandleStatic(ex)
		} else {
			ex.RespondError(http.StatusNotFound, "not-found", "Not found.")
		}
		return
	}

	names := route.Pattern.SubexpNames()
	for i, name := range names {
		if name != "" {
			ex.Fields[name] = match[i]
		}
	}

	route.Fn(ex)
}
