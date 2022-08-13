package send_mail

import (
	"bytes"
	"context"
	"github.com/sharat87/littletools/exchange"
	"log"
	"net/http"
	"net/smtp"
	"strings"
)

const HeaderTerm = "\r\n"

type (
	Job struct {
		Host    string   `json:"host"`
		Port    string   `json:"port"`
		User    string   `json:"user"`
		Pass    string   `json:"pass"`
		From    string   `json:"from"`
		To      []string `json:"to"`
		Subject string   `json:"subject"`
		Body    string   `json:"body"`
	}
)

func HandleSendMail(_ context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodPost) != nil {
		return
	}

	job := Job{}
	err := ex.DecodeBody(&job)
	if err != nil {
		log.Printf("Error decoding payload: %+v", err)
		ex.RespondError(
			http.StatusBadRequest,
			"error-decoding-payload",
			"Error decoding payload",
		)
		return
	}

	var buffer bytes.Buffer

	buffer.WriteString("From: " + sanitizeForHeaderValue(job.From) + HeaderTerm)
	for _, to := range job.To {
		buffer.WriteString("To: " + sanitizeForHeaderValue(to) + HeaderTerm)
	}
	buffer.WriteString("Subject: " + sanitizeForHeaderValue(job.Subject) + HeaderTerm)

	buffer.WriteString(HeaderTerm)
	buffer.WriteString(job.Body + HeaderTerm)

	var auth smtp.Auth
	if job.User != "" && job.Pass != "" {
		// Note: This will only send the credentials on TLS, or localhost.
		auth = smtp.PlainAuth("", job.User, job.Pass, job.Host)
	}

	err = smtp.SendMail(job.Host+":"+job.Port, auth, job.From, job.To, buffer.Bytes())
	if err != nil {
		log.Printf("Error sending email: %v", err)
		ex.RespondError(
			http.StatusBadRequest,
			"error-sending-email",
			"Error sending email: "+err.Error(),
		)
		return
	}

	ex.Respond(http.StatusOK, map[string]any{
		"ok": true,
	})
}

func sanitizeForHeaderValue(value string) string {
	return strings.ReplaceAll(strings.ReplaceAll(value, "\r", ""), "\n", "")
}
