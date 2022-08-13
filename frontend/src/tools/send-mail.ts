import m from "mithril"
import { Button, CopyButton, Input, Textarea } from "~/src/components"
import Stream from "mithril/stream"

type Result = {
	ok: true
} | {
	ok: false
	errorMessage: string
}

export default class implements m.ClassComponent {
	static title = "Send Mail"

	private readonly host: Stream<string>
	private readonly port: Stream<string>
	private readonly user: Stream<string>
	private readonly pass: Stream<string>
	private readonly fromAddress: Stream<string>
	private readonly toAddress: Stream<string>
	private readonly subject: Stream<string>
	private readonly body: Stream<string>
	private readonly lastResult: Stream<null | Result>

	constructor() {
		this.host = Stream("localhost")
		this.port = Stream("25")
		this.user = Stream("")
		this.pass = Stream("")
		this.fromAddress = Stream("me@example.com")
		this.toAddress = Stream("another@example.com")
		this.subject = Stream("Test from LittleTools.app")
		this.body = Stream("Hello there! This is a test email from LittleTools.app!")
		this.lastResult = Stream(null)
	}

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

	view() {
		const lastResult = this.lastResult()
		return m(".container.h-100.d-flex.flex-column.vstack", [
			m(".hstack", [
				m("h1.flex-grow-1", "Send Mail"),
				m(CopyButton, {
					size: "sm",
					appearance: "outline-secondary",
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
						}))
						return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
					},
				}, "Copy Permalink"),
			]),
			m("p", "Send an email using your SMTP server. Useful to test your SMTP server."),
			m(
				"form",
				{
					onsubmit: (e: Event) => {
						e.preventDefault()
						this.lastResult(null)
						m.request<{ error?: { code: string, message: string } }>({
							method: "POST",
							url: "/api/send-mail",
							body: {
								host: this.host(),
								port: this.port(),
								from: this.fromAddress(),
								user: this.user(),
								pass: this.pass(),
								to: this.toAddress().split(/\s*[,;]\s*/),
								subject: this.subject(),
								body: this.body(),
							},
						})
							.then((response) => {
								if (response.error != null) {
									this.lastResult({
										ok: false,
										errorMessage: response.error.message,
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
									errorMessage: err.response.error.message,
								})
							})
					},
				},
				[
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "Host")),
						m(".col-5", m(Input, {
							model: this.host,
						})),
					]),
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "Port")),
						m(".col-5", m(Input, {
							model: this.port,
						})),
					]),
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "User")),
						m(".col-5", m(Input, {
							model: this.user,
						})),
					]),
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "Password")),
						m(".col-5", m(Input, {
							model: this.pass,
						})),
					]),
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "From")),
						m(".col-5", m(Input, {
							model: this.fromAddress,
						})),
					]),
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "To")),
						m(".col-5", m(Input, {
							model: this.toAddress,
						})),
					]),
					m(".mb-3.row", [
						m(".col-1", m("label.col-form-label", "Body Text")),
						m(".col-5", m(Textarea, {
							model: this.body,
						})),
					]),
					lastResult != null && m(".mb-3.row", m(".col-6.alert", {
						class: lastResult.ok ? "alert-success" : "alert-danger",
					}, lastResult.ok ? "Email sent successfully." : lastResult.errorMessage)),
					m(Button, { appearance: "primary" }, "Send email"),
				],
			),
		])
	}

}
