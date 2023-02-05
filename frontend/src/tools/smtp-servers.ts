import m from "mithril"
import Stream from "mithril/stream"
import { Button, Form, Input, ToolView } from "~/src/components"
import { CodeBlock } from "../components"

enum ConnectionStatus {
	NotConnected,
	Connecting,
	Connected,
	Closed,
	Error,
}

export default class extends ToolView {
	static title = "SMTP Servers (Beta)"

	private readonly authChoice: Stream<string> = Stream("none")
	private readonly tlsChoice: Stream<string> = Stream("none")
	private readonly watchInput: Stream<string> = Stream("to@ex.co")  // Stream("random" + Math.random() + "@example.com")
	private readonly currentWatch: Stream<null | string> = Stream(null)
	private readonly mails: string[] = []
	private socket: null | WebSocket = null
	private connectionStatus: ConnectionStatus = ConnectionStatus.NotConnected
	private portsByServerType: null | Record<string, number> = null

	constructor() {
		super()
		m.request<Record<string, number>>("/x/smtp-servers").then(portsByServerType => {
			this.portsByServerType = portsByServerType
		})
	}

	onbeforeremove() {
		this.stopWatching()
	}

	mainView(): m.Children {
		const chosenPort = this.portsByServerType?.[`auth:${ this.authChoice() },tls:${ this.tlsChoice() }`]
		return [
			m("p.lead.mb-0", "This is a set of fake SMTP servers that'll accept any email and just show it here. No emails are actually sent for real."),
			m("details.card.p-2", [
				m("summary", "SMTP Connection Details"),
				m(".d-flex", [
					m(Form, {
						id: "smtp-server-choice",
						class: "text-nowrap",
						fields: [
							Form.radioField("Authentication", this.authChoice, {
								none: "None",
								require_any: "Require",
								require_plain: "Require PLAIN only",
								require_login: "Require LOGIN only",
							}),
							Form.radioField("SSL/TLS", this.tlsChoice, {
								none: "Disable",
								implicit_tls: "Implicit TLS",
								starttls: "STARTTLS",
							}),
						],
					}),
					m(".vstack.border-start.ms-3.ps-3.min-w-0", [
						m("ul", [
							m("li", "Host: ", m("code", "fake-smtp.littletools.app")),
							m("li", "Port: ", m("code", chosenPort ?? m("em", "unavailable"))),
							this.authChoice() !== "none" && [
								m("li", "Username: ", m("code", "little")),
								m("li", "Password: ", m("code", "non-secret")),
							],
						]),
						m("p", "Sample curl command:"),
						m(CodeBlock, [
							`echo "From: from@ex.co\nTo: to@ex.co\nSubject: Hey\nDate: $(date +'%a, %d %b %Y %H:%m:%S')\n\nTest email content" | curl`,
							this.tlsChoice() === "starttls" ? " --ssl-reqd" : "",
							` smtp${ this.tlsChoice() === "implicit_tls" ? "s" : "" }://fake-smtp.littletools.app:${ chosenPort }`,
							` --mail-from from@ex.co --mail-rcpt to@ex.co`,
							this.authChoice() !== "none" ? ` -u little:non-secret` : "",
							` --upload-file -`,
						]),
					]),
				]),
			]),
			m("form.hstack.gap-2.my-4", {
				onsubmit: (event: SubmitEvent) => {
					event.preventDefault()
					if (this.socket == null) {
						const host = window.location.hostname === "localhost" ? "localhost:3061" : window.location.host
						this.socket = new WebSocket((window.location.protocol === "https://" ? "wss" : "ws") + `://${ host }/x/smtp-ws`)
						this.socket.addEventListener("message", (event: MessageEvent) => {
							if (event.data == "hello") {
								this.connectionStatus = ConnectionStatus.Connected
								this.socket?.send(JSON.stringify({ watch: this.currentWatch() }))
								this.currentWatch(this.watchInput())
							} else if (event.data === "ok") {
								// Ignore. This is just an ack to the watch message.
							} else {
								this.mails.push(JSON.parse(event.data).msg as string)
							}
							m.redraw()
						})
						this.socket.addEventListener("error", () => {
							this.connectionStatus = ConnectionStatus.Error
							this.socket = null
							m.redraw()
						})
						const handler = () => {
							this.connectionStatus = ConnectionStatus.Connecting
							this.socket?.removeEventListener("open", handler)
						}
						this.socket.addEventListener("open", handler)
					} else if (this.connectionStatus === ConnectionStatus.Connected) {
						this.socket.send(JSON.stringify({ watch: this.currentWatch() }))
						this.currentWatch(this.watchInput())
					}
				},
			}, [
				m("label", "Watch for emails to: "),
				m(Input, {
					class: "w-auto",
					model: this.watchInput,
				}),
				m(Button, {
					appearance: "primary",
				}, "Start Watching"),
			]),
			this.connectionStatus !== ConnectionStatus.NotConnected && m("p", "Connection Status: ", this.connectionStatus === ConnectionStatus.Connecting ? "Connecting..." : this.connectionStatus === ConnectionStatus.Connected ? "Connected" : this.connectionStatus === ConnectionStatus.Closed ? "Closed" : "Error"),
			this.currentWatch() != null && m(".hstack.gap-2", [
				m("p.m-0", [
					"Watching inbox of ",
					m("code", this.currentWatch()),
					".",
				]),
				m(Button, {
					appearance: "outline-danger",
					size: "sm",
					onclick: () => {
						this.stopWatching()
					},
				}, "Stop Watching"),
			]),
			this.mails.length > 0 && m("div", this.mails.map((mail) => m("pre", mail))),
		]
	}

	stopWatching() {
		this.connectionStatus = ConnectionStatus.Closed
		this.currentWatch(null)
		this.socket?.close()
	}

}
