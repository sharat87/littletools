import m from "mithril"
import { Button, CopyButton, Input, Textarea, ToolView } from "~/src/components"
import Stream from "mithril/stream"

type Result = {
	ok: true
} | {
	ok: false
	errorMessage: string
}

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
				"form.vstack.gap-3.flex-1",
				{
					onsubmit: (e: Event) => {
						e.preventDefault()
						this.lastResult(null)
						this.isSending = true
						m.redraw()
						m.request<{ error?: { code: string, message: string } }>({
							method: "POST",
							url: "/x/send-mail",
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
							.finally(() => {
								this.isSending = false
								m.redraw()
							})
					},
				},
				[
					m(".row", [
						m(".col-1", m("label.col-form-label", "Host")),
						m(".col-5", [
							m(Input, {
								model: this.host,
							}),
							["localhost", "127.0.0.1"].includes(this.host()) && m(".text-danger", "If you are trying to send an email from localhost, you should use a tunneling service like ngrok to expose it first."),
						]),
					]),
					m(".row", [
						m(".col-1", m("label.col-form-label", "Port")),
						m(".col-5", m(Input, {
							model: this.port,
						})),
					]),
					m(".row", [
						m(".col-1", m("label.col-form-label", "User")),
						m(".col-5", m(Input, {
							model: this.user,
						})),
					]),
					m(".row", [
						m(".col-1", m("label.col-form-label", "Password")),
						m(".col-5", m(Input, {
							model: this.pass,
						})),
					]),
					m(".row", [
						m(".col-1", m("label.col-form-label", "From")),
						m(".col-5", m(Input, {
							model: this.fromAddress,
						})),
					]),
					m(".row", [
						m(".col-1", m("label.col-form-label", "To")),
						m(".col-5", m(Input, {
							model: this.toAddress,
						})),
					]),
					m(".row", [
						m(".col-1", m("label.col-form-label", "Body Text")),
						m(".col-5", m(Textarea, {
							model: this.body,
						})),
					]),
					lastResult != null && m(".row", m(".col-6", m(".alert", {
						class: lastResult.ok ? "alert-success" : "alert-danger",
					}, lastResult.ok ? "Email sent successfully." : lastResult.errorMessage))),
					m(".row", m(".col-7",
						m(Button, { appearance: "primary", isLoading: this.isSending }, "Send email"),
					)),
				],
			),
		]
	}

}
