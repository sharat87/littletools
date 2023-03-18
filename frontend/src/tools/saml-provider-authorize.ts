import m from "mithril"
import { ToolView } from "~/src/components"
import Stream from "mithril/stream"
import { Button, Form, Icon, Input } from "../components"
import { request } from "../utils"

/*
 * This is the authorize page of the fake SAML provider.
 */

export default class extends ToolView {
	static title = "SAML Provider Authorize"
	static isHidden = true
	static isKioskMode = true

	name: Stream<string> = Stream("Agent Smith")
	email: Stream<string> = Stream("smith@example.com")

	method: Stream<string>
	requestId: Stream<string>
	spIssuer: Stream<string>
	spEndpoint: Stream<string>
	relayState: Stream<string>
	sessionIndex: Stream<string>

	constructor() {
		super()
		const params = new URL(location.href).searchParams
		this.method = Stream(params.get("method") ?? "POST")
		this.requestId = Stream(params.get("requestId") ?? "")
		this.spIssuer = Stream(params.get("spIssuer") ?? "")
		this.spEndpoint = Stream(params.get("spEndpoint") ?? "")
		this.relayState = Stream(params.get("relayState") ?? "")
		this.sessionIndex = Stream(params.get("sessionIndex") ?? "")
	}

	mainView(): m.Children {
		return [
			m("p.lead", "This is a fake authentication approval page. If you weren't expecting to see this, close this tab and report to the admin of whatever website sent you here."),
			m("p.text-danger.my-2", "Don't provide any real credentials, and don't use this in production."),
			m(Form, {
				id: "saml-idp-auth",
				onsubmit: async (event: Event) => {
					event.preventDefault()
					const { samlResponse } = await request<{ samlResponse: string }>("/x/saml/make-response", {
						method: "POST",
						body: {
							compress: this.method() === "GET",
							name: this.name(),
							email: this.email(),
							requestId: this.requestId(),
							spIssuer: this.spIssuer(),
							spEndpoint: this.spEndpoint(),
							sessionIndex: this.sessionIndex(),
						},
					})
					const form = document.createElement("form")
					form.action = this.spEndpoint()
					form.method = this.method()
					const input = document.createElement("input")
					input.name = "SAMLResponse"
					input.value = samlResponse
					form.appendChild(input)
					const relayState = document.createElement("input")
					relayState.name = "RelayState"
					relayState.value = this.relayState()
					form.appendChild(relayState)
					form.style.height = "0"
					document.body.appendChild(form)
					form.submit()
				},
				fields: [
					Form.field("Name", () => m(Input, { model: this.name })),
					Form.field("Email", () => m(Input, { model: this.email }))
						.subText(!this.email().endsWith("@example.com") && ["Domain in the email will be changed to ", m("code", "@example.com"), "."]),
				],
				buttons: () => [
					m(Button, {
						appearance: "success",
						type: "submit",
						name: "choice",
						value: "approve",
					}, [m(Icon, "done"), "Approve"]),
					m(Button, {
						appearance: "outline-danger",
						type: "submit",
						name: "choice",
						value: "reject",
					}, [m(Icon, "close"), "Reject"]),
				],
			}),
			m(".row.mb-3", [
				m("label.col-md-2.col-form-label"),
				m(".col-md-5", m(".form-text.text-secondary", ["Powered by ", m("a", { href: "https://littletools.app/saml-provider" }, "LittleTools"), "."])),
			]),
		]
	}

}
