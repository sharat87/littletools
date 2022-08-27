package main

import (
	"github.com/sharat87/littletools/config"
	"github.com/sharat87/littletools/httpclient"
	"github.com/sharat87/littletools/mux"
	"log"
	"net"
	"net/http"
	"runtime/debug"
	"time"
)

var ( // Values injected at build time.
	Version   string
	BuildTime string
)

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile | log.LUTC | log.Lmsgprefix)

	logMetaInformation()
	cfg := config.MustLoad()

	listener, err := net.Listen("tcp", cfg.BindTarget)
	if err != nil {
		log.Panicf("Error creating listener: %v", err)
	}

	m := mux.New()

	m.UseConfig(cfg)

	m.UseHTTPClient(httpclient.New())

	s := &http.Server{
		Handler:        m,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 10,
	}

	log.Printf("Serving on http://%s...", cfg.BindTarget)

	err = s.Serve(listener)
	if err != nil {
		log.Panicf("Server returned error: %v", err)
	}
}

func logMetaInformation() {
	var commit string
	var isCommitClean bool

	buildInfo, ok := debug.ReadBuildInfo()
	if !ok {
		log.Println("Could not read build information")

	} else {
		for _, setting := range buildInfo.Settings {
			if setting.Key == "vcs.revision" {
				commit = setting.Value
			} else if setting.Key == "vcs.modified" {
				isCommitClean = setting.Value == "false"
			}
		}

	}

	if !isCommitClean {
		if commit != "" {
			commit += " "
		}
		commit += "(dirty)"
	}

	log.Printf("Version: %q, Commit: %q, Built: %q", Version, commit, BuildTime)
}
