package assets

import (
	"context"
	"embed"
	"github.com/sharat87/littletools/exchange"
	"log"
	"mime"
	"net/http"
	"strings"
)

// The static folder contains frontend build artifacts.
//go:embed *
var assets embed.FS

func HandleStatic(_ context.Context, ex *exchange.Exchange) {
	err := WriteAsset("static/"+strings.TrimPrefix(ex.Request.URL.Path, "/"), ex.ResponseWriter, ex.Request)
	if err != nil {
		err := WriteAsset("static/index.html", ex.ResponseWriter, ex.Request)
		if err != nil {
			ex.RespondError(http.StatusInternalServerError, "index-on-404-fail", "Not found")
		}
	}
}

func WriteAsset(name string, w http.ResponseWriter, request http.Request) error {
	if content, err := assets.ReadFile(name); err == nil {
		parts := strings.Split(name, ".")
		extension := parts[len(parts)-1]
		contentType := mime.TypeByExtension("." + extension)
		if contentType != "" {
			w.Header().Set("Content-Type", contentType)
		}

		if _, err := w.Write(content); err != nil {
			log.Printf("Error writing asset content %v", err)
			return err
		}

	} else {
		if strings.HasSuffix(err.Error(), " is a directory") {
			parts := strings.Split(name, "/")
			http.Redirect(w, &request, "./"+parts[len(parts)-1]+"/", http.StatusPermanentRedirect)
		} else if !strings.HasSuffix(err.Error(), " file does not exist") {
			log.Printf("Error responding to static file: %v", err)
		}
		return err

	}

	return nil
}
