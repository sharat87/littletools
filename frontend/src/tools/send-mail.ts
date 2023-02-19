import m from "mithril"
import { Button, CopyButton, Form, Input, Textarea, ToolView } from "~src/components"
import Stream from "mithril/stream"
import { request } from "~src/utils"
import { Icon } from "../components"

type Result = {
	ok: true
	log?: SMTPLog[]
} | {
	ok: false
	errorMessage: string
	log?: SMTPLog[]
}

type SMTPLog = {
	dir: "send" | "recv"
	body: string
}

type SSLMode = "disable" | "connect-with-tls" | "starttls-when-available" | "starttls-required"

export default class extends ToolView {
	static title = "Send Mail"
	static layout = ToolView.Layout.Page

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
			m("p.lead", "Send an email using your SMTP server. Useful to test your SMTP server."),
			m(".d-flex", [
				m(Form, {
					id: "send-mail",
					class: "py-1 overflow-auto flex-1",
					onsubmit: (e: Event) => {
						e.preventDefault()
						this.lastResult(null)
						this.isSending = true
						m.redraw()
						request<{ error?: string, log: SMTPLog[] }>("/x/send-mail", {
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
										log: response.log,
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
					fields: [
						Form.field("Presets", () => m(".btn-group.btn-group-sm", [
							m(Button, {
								appearance: "outline-primary",
								onclick: () => {
									this.host("smtp.gmail.com")
									this.port("587")
									this.sslMode("starttls-required")
									this.user("")
									this.pass("")
								}
							}, "Gmail"),
							m(Button, {
								appearance: "outline-primary",
								onclick: () => {
									this.host("email-smtp.us-west-2.amazonaws.com")
									this.port("587")
									this.sslMode("starttls-required")
									this.user("$AWS_ACCESS_KEY_ID")
									this.pass("$AWS_SECRET_ACCESS_KEY")
								},
							}, "AWS SES"),
							m(Button, {
								appearance: "outline-primary",
								onclick: () => {
									this.host("smtp.sendgrid.net")
									this.port("587")
									this.sslMode("starttls-required")
									this.user("")
									this.pass("")
								}
							}, "SendGrid"),
						])),
						Form.field("Endpoint", () => m(".hstack.gap-2", [
							m(Input, {
								model: this.host,
								required: true,
								placeholder: "Host",
							}),
							m(Input, {
								model: this.port,
								required: true,
								placeholder: "Port",
							}),
						])),
						Form.radioField("SSL Mode", this.sslMode, {
							"disable": "Disable",
							"connect-with-tls": "Connect with TLS",
							"starttls-when-available": "StartTLS when available",
							"starttls-required": "StartTLS required",
						}),
						Form.field("Authenticate", () => m(".hstack.gap-2", [
							m(Input, {
								model: this.user,
								placeholder: "Username",
							}),
							m(Input, {
								model: this.pass,
								placeholder: "Password",
							}),
						])),
						Form.field("From", () => m(Input, {
							model: this.fromAddress,
						})),
						Form.field("To", () => m(Input, {
							model: this.toAddress,
						})).subText("Separate multiple addresses with commas or semicolons."),
						Form.field("Text Body", () => m(Textarea, {
							model: this.body,
						})),
					],
				}),
				lastResult != null && m(".p-2.flex-1", [
					m("h3", "SMTP Log"),
					m(".alert.flex-1.py-2", {
						class: lastResult.ok ? "alert-success" : "alert-danger",
					}, lastResult.ok ? "Email sent successfully." : lastResult.errorMessage),
					lastResult.log != null && m("ol", lastResult?.log.map((entry: SMTPLog) => m("li", [
						// TODO: In Bootstrap v5.3, add `-emphasis` to the color classes to make them more visible.
						entry.dir === "send" ? m(Icon, { class: "text-warning" }, "arrow_upward") : m(Icon, { class: "text-info" }, "arrow_downward"),
						m("span.ms-1", entry.body),
					]))),
				]),
			]),
			m(".p-2.hstack.gap-2", [
				m(Button, {
					form: "send-mail",
					appearance: "primary",
					isLoading: this.isSending,
				}, [m(Icon, "outgoing_mail"), "Send email"]),
				m(CopyButton, {
					appearance: "outline-secondary",
					size: "m",
					content: (): string => {
						return this.generateCurlCommand()
					},
				}, "Copy cURL command"),
			]),
		]
	}

	private generateCurlCommand(): string {
		// Ref: <https://everything.curl.dev/usingcurl/smtp>.
		const sslMode = this.sslMode()
		return [
			`echo 'From: ${ this.fromAddress() }\nTo: ${ this.toAddress() }\nSubject: ${ this.subject() }\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"'\n\n${ this.body() }'`,
			`| curl smtp${ sslMode === "connect-with-tls" ? "s" : "" }://${ this.host() }:${ this.port() }`,
			`--mail-from '${ this.fromAddress() }'`,
			`--mail-rcpt '${ this.toAddress() }'`,
			`--user '${ this.user() }:${ this.pass() }'`,
			sslMode === "starttls-when-available" ? `--ssl` : null,
			sslMode === "starttls-required" ? `--ssl-reqd` : null,
			`--upload-file -`,
		].filter(s => s != null).join(" ")
	}

}
