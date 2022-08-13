package mux

import (
	"context"
	"github.com/sharat87/littletools/assets"
	"github.com/sharat87/littletools/config"
	"github.com/sharat87/littletools/exchange"
	"github.com/sharat87/littletools/httpclient"
	"github.com/sharat87/littletools/send_mail"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
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

type HandlerFn func(ctx context.Context, ex *exchange.Exchange)

func New() *Mux {
	m := &Mux{}

	m.Route(`/api/send-mail`, send_mail.HandleSendMail)

	return m
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
	ctx, cancelFunc := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelFunc()

	if req.RequestURI == "*" {
		if req.ProtoAtLeast(1, 1) {
			w.Header().Set("Connection", "close")
		}
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	host := req.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = req.Host
	}
	host = strings.SplitN(host, ":", 2)[0] // Remove port if present.
	if _, ok := mux.Config.AllowedHosts[host]; !ok {
		log.Printf("Host not allowed: %s", host)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("Host not allowed."))
		return
	}

	// Require JSON content type.
	if req.Method != http.MethodGet && getContentType(req) != "application/json" {
		w.WriteHeader(http.StatusBadRequest)
		_, err := w.Write([]byte(http.StatusText(http.StatusBadRequest)))
		if err != nil {
			log.Printf("Error writing response, when content type isn't json: %v", err)
		}
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
		if ex.Request.Method == http.MethodGet {
			assets.HandleStatic(ctx, ex)
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

	route.Fn(ctx, ex)
}

func getContentType(r *http.Request) string {
	return strings.Split(r.Header.Get("Content-Type"), ";")[0]
}
