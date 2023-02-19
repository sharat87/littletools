import m from "mithril"
import { ToolView } from "~/src/components"
import Stream from "mithril/stream"
import { Form, Input } from "../components"

/*
 * This is the authorize page of the fake OIDC provider.
 */

export default class extends ToolView {
	static title = "OIDC Provider Authorize"
	static isHidden = true
	static isKioskMode = true

	name: Stream<string> = Stream("Agent Smith")
	email: Stream<string> = Stream("smith@example.com")

	responseType: Stream<string>
	clientId: Stream<string>
	redirectURI: Stream<string>
	scope: Stream<string>
	state: Stream<string>
	nonce: Stream<string>
	audience: Stream<string>

	constructor() {
		super()
		const params = new URL(location.href).searchParams
		this.responseType = Stream(params.get("response_type") ?? "")
		this.clientId = Stream(params.get("client_id") ?? "")
		this.redirectURI = Stream(params.get("redirect_uri") ?? "")
		this.scope = Stream(params.get("scope") ?? "")
		this.state = Stream(params.get("state") ?? "")
		this.nonce = Stream(params.get("nonce") ?? "")
		this.audience = Stream(params.get("audience") ?? "")
	}

	mainView(): m.Children {
		return [
			m("p", "This is a fake authentication approval. If you weren't expecting to see this, close this tab and report to the admin of whatever website that sent you here."),
			m("p.text-danger", "Don't provide any real credentials, and don't use this in production."),
			m(Form, {
				id: "oidc-idp-auth",
				action: "/x/oidc/authorize-submit",
				fields: [
					Form.field("Name", () => m(Input, { name: "name", model: this.name })),
					Form.field("Email", () => m(Input, { name: "email", model: this.email }))
						.subText(["Domain in the email will be changed to ", m("code", "@example.com"), "."]),
					Form.field("Redirect URI", () => m(Input, {
						id: "redirectUri",
						name: "redirect_uri",
						model: this.redirectURI,
					})),
					Form.field("Client ID", () => m(Input, {
						id: "clientId",
						name: "client_id",
						model: this.clientId,
					})),
					Form.field("Scope", () => m(Input, { id: "scope", name: "scope", model: this.scope })),
					Form.field("State", () => m(Input, { id: "state", name: "state", model: this.state })),
					Form.field("NOnce", () => m(Input, { id: "nonce", name: "nonce", model: this.nonce })),
					Form.field("Audience", () => m(Input, {
						id: "audience",
						name: "audience",
						model: this.audience,
					})),
				],
				buttons: () => [
					m("button.btn.btn-success", {
						type: "submit",
						name: "choice",
						value: "approve",
					}, "Approve"),
					m("button.btn.btn-outline-danger", {
						type: "submit",
						name: "choice",
						value: "reject",
					}, "Reject"),
				],
			}),
			m(".row.mb-3", [
				m("label.col-md-2.col-form-label"),
				m(".col-md-5", m(".form-text.text-secondary", ["Powered by ", m("a", { href: "https://littletools.app/oidc-provider" }, "LittleTools"), "."])),
			]),
		]
	}

}
