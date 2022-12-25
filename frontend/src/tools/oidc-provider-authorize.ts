import m from "mithril"
import { ToolView } from "~/src/components"
import Stream from "mithril/stream"
import { Input } from "../components"

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
			m("form", {
				method: "POST",
				action: "/x/oidc/authorize-submit",
			}, [
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "userName" }, "Name"),
					m(".col-md-5", m(Input, {
						id: "userName",
						name: "name",
						model: this.name,
					})),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "userEmail" }, "Email"),
					m(".col-md-5", [
						m(Input, {
							id: "userEmail",
							name: "email",
							model: this.email,
						}),
						m(".form-text.text-muted", ["Domain in the email will be changed to ", m("code", "@example.com"), "."]),
					]),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "redirectUri" }, "Redirect URI"),
					m(".col-md-5", m(Input, { id: "redirectUri", name: "redirect_uri", model: this.redirectURI })),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "clientId" }, "Client ID"),
					m(".col-md-5", m(Input, { id: "clientId", name: "client_id", model: this.clientId })),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "state" }, "State"),
					m(".col-md-5", m(Input, { id: "state", name: "state", model: this.state })),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "nonce" }, "NOnce"),
					m(".col-md-5", m(Input, { id: "nonce", name: "nonce", model: this.nonce })),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label.text-md-end", { for: "audience" }, "Audience"),
					m(".col-md-5", m(Input, { id: "audience", name: "audience", model: this.audience })),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label"),
					m(".col-md-5", m(".hstack.gap-2", [
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
					])),
				]),
				m(".row.mb-3", [
					m("label.col-md-2.col-form-label"),
					m(".col-md-5", m(".form-text.text-muted", ["Powered by ", m("a", { href: "https://littletools.app/oidc-provider" }, "LittleTools"), "."])),
				]),
			]),
		]
	}

}
