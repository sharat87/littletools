import m from "mithril"
import { Button, CopyButton, Input, Textarea, ToolView } from "~/src/components"
import Stream from "mithril/stream"
import { request } from "../utils"

type Result = {
	ok: true
} | {
	ok: false
	errorMessage: string
}

type SSLMode = "disable" | "connect-with-tls" | "starttls-when-available" | "starttls-required"

export default class extends ToolView {
	static title = "Send Mail"

	private readonly host: Stream<string> = Stream("")
	private readonly port: Stream<string> = Stream("25")
	private readonly user: Stream<string> = Stream("")
	private readonly pass: Stream<string> = Stream("")
	private readonly fromAddress: Stream<string> = Stream("me@example.com")
	private readonly toAddress: Stream<string> = Stream("another@example.com")
	private readonly subject: Stream<string> = Stream("Test from LittleTools.app")
	private readonly body: Stream<string> = Stream("Hello there! This is a test email from LittleTools.app!")
	private readonly sslMode: Stream<SSLMode> = Stream("starttls-when-available")
	private readonly lastResult: Stream<null | Result> = Stream(null)
	private isSending: boolean = false

	oncreate() {
		const rawData = window.location.search.substring(1)
		if (rawData != null && rawData != "") {
			const data = JSON.parse(window.atob(rawData))
			this.host(data.host ?? "")
			this.port(data.port ?? "")
			this.user(data.user ?? "")
			this.pass(data.pass ?? "")
			this.fromAddress(data.fromAddress ?? "")
			this.toAddress(data.toAddress ?? "")
			this.subject(data.subject ?? "")
			this.body(data.body ?? "")
			m.redraw()
		}
	}

	headerEndView(): m.Children {
		return m(CopyButton, {
			content: (): string => {
				const data = window.btoa(JSON.stringify({
					host: this.host(),
					port: this.port(),
					user: this.user(),
					pass: this.pass(),
					fromAddress: this.fromAddress(),
					toAddress: this.toAddress(),
					subject: this.subject(),
					body: this.body(),
					sslMode: this.sslMode(),
				}))
				return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
			},
		}, "Permalink")
	}

	mainView(): m.Children {
		const lastResult = this.lastResult()
		return [
			m("p", "Send an email using your SMTP server. Useful to test your SMTP server."),
			m(
				"form.vstack.gap-3.py-3.overflow-auto.container#send-mail-form",
				{
					onsubmit: (e: Event) => {
						e.preventDefault()
						this.lastResult(null)
						this.isSending = true
						m.redraw()
						request<{ error?: string }>("/x/send-mail", {
							method: "POST",
							body: {
								host: this.host(),
								port: parseInt(this.port(), 10),
								username: this.user(),
								password: this.pass(),
								sender: this.fromAddress(),
								to: this.toAddress().split(/\s*[,;]\s*/),
								subject: this.subject(),
								body_plain: this.body(),
								ssl: this.sslMode(),
							},
						})
							.then((response) => {
								if (response.error != null) {
									this.lastResult({
										ok: false,
										errorMessage: response.error,
									})
								} else {
									this.lastResult({
										ok: true,
									})
								}
							})
							.catch((err) => {
								this.lastResult({
									ok: false,
									errorMessage: err.response.error,
								})
							})
							.finally(() => {
								this.isSending = false
								m.redraw()
							})
					},
				},
				[
					m(".row", [
						m(".col-2", m("label.col-form-label", "Host")),
						m(".col-5", [
							m(Input, {
								model: this.host,
								required: true,
							}),
							["localhost", "127.0.0.1"].includes(this.host()) && m(".text-danger", "If you are trying to send an email from localhost, you should use a tunneling service like ngrok to expose it first."),
						]),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "Port (number)")),
						m(".col-5", m(Input, {
							model: this.port,
							required: true,
							pattern: "[0-9]{1,5}",
						})),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "SSL Mode")),
						m(".col-5", [
							m("label.d-block", [
								m("input", {
									type: "radio",
									name: "sslMode",
									value: "disable",
									checked: this.sslMode() === "disable",
									onchange: () => this.sslMode("disable"),
								}),
								m("span.ms-1", "Disable"),
							]),
							m("label.d-block", [
								m("input", {
									type: "radio",
									name: "sslMode",
									value: "connect-with-tls",
									checked: this.sslMode() === "connect-with-tls",
									onchange: () => this.sslMode("connect-with-tls"),
								}),
								m("span.ms-1", "Connect with TLS"),
							]),
							m("label.d-block", [
								m("input", {
									type: "radio",
									name: "sslMode",
									value: "starttls-when-available",
									checked: this.sslMode() === "starttls-when-available",
									onchange: () => this.sslMode("starttls-when-available"),
								}),
								m("span.ms-1", "STARTTLS when available"),
							]),
							m("label.d-block", [
								m("input", {
									type: "radio",
									name: "sslMode",
									value: "starttls-required",
									checked: this.sslMode() === "starttls-required",
									onchange: () => this.sslMode("starttls-required"),
								}),
								m("span.ms-1", "STARTTLS required"),
							]),
						]),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "Username")),
						m(".col-5", m(Input, {
							model: this.user,
						})),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "Password")),
						m(".col-5", m(Input, {
							model: this.pass,
						})),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "From address")),
						m(".col-5", m(Input, {
							model: this.fromAddress,
						})),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "To addresses (comma separated)")),
						m(".col-5", m(Input, {
							model: this.toAddress,
						})),
					]),
					m(".row", [
						m(".col-2", m("label.col-form-label", "Body Text")),
						m(".col-5", m(Textarea, {
							model: this.body,
						})),
					]),
				],
			),
			m(".p-2.border-top", [
				lastResult != null && m(".row", m(".col-7", m(".alert", {
					class: lastResult.ok ? "alert-success" : "alert-danger",
				}, lastResult.ok ? "Email sent successfully." : lastResult.errorMessage))),
				m(Button, {
					form: "send-mail-form",
					appearance: "primary",
					isLoading: this.isSending,
				}, "Send email"),
			]),
		]
	}

}
