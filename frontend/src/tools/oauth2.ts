import m from "mithril"
import { Button, CopyButton, Input } from "~/src/components"
import Stream from "mithril/stream"

export default class implements m.ClassComponent {
	static title = "OAuth 2.0 Client"

	private isForm = true
	private data: any = null

	oncreate() {
		const rawData = window.location.search.substring(1)
		if (rawData != null && rawData != "") {
			const data = this.data = JSON.parse(window.atob(rawData))
			this.isForm = data.view !== "result"
			m.redraw()
		}
	}

	view() {
		return this.isForm == null
			? m("p", "Loading...")
			: (this.isForm ? m(FormView, { data: this.data }) : m(ResultView, { data: this.data }))
	}

}

class FormView implements m.ClassComponent<{ data: any }> {

	private readonly authorizeURL: Stream<string> = Stream("https://httpbun.com/oauth/authorize")
	private readonly tokenURL: Stream<string> = Stream("")
	private readonly clientID: Stream<string> = Stream("client-id-dummy")
	private readonly clientSecret: Stream<string> = Stream("client-secret-dummy")
	private readonly scope: Stream<string> = Stream("")
	private readonly state: Stream<string> = Stream("")

	oncreate(vnode: m.VnodeDOM<{ data: any }>) {
		const data = vnode.attrs.data
		if (data == null) {
			return
		}
		if (data.authorizeURL != null) {
			this.authorizeURL(data.authorizeURL)
		}
		if (data.tokenURL != null) {
			this.tokenURL(data.tokenURL)
		}
		if (data.clientID != null) {
			this.clientID(data.clientID)
		}
		if (data.clientSecret != null) {
			this.clientSecret(data.clientSecret)
		}
		if (data.scope != null) {
			this.scope(data.scope)
		}
		if (data.state != null) {
			this.state(data.state)
		}
		m.redraw()
	}

	view() {
		return m(".container", [
			m(".hstack", [
				m("h1.flex-grow-1", "OAuth 2.0 Client"),
				m(CopyButton, {
					content: (): string => {
						const data = window.btoa(JSON.stringify({
							authorizeURL: this.authorizeURL(),
							tokenURL: this.tokenURL(),
							clientID: this.clientID(),
							clientSecret: this.clientSecret(),
							scope: this.scope(),
							state: this.state(),
						}))
						return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
					},
				}, "Copy Permalink"),
			]),
			m("p", "This is incomplete, and a WIP."),
			m("p", "Perform an OAuth 2.0 based dummy Authorization with the following configuration. Note that the resulting access token is not saved by LittleTools, and will be visible here in plain-text, once auth is done."),
			m(
				"form.vstack.gap-3",
				{
					method: "POST",
					action: "/x/oauth2-client-start",
				},
				[
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "authorizeURL",
						}, "Authorize URL")),
						m(".col-5", m(Input, {
							id: "authorizeURL",
							name: "authorizeURL",
							model: this.authorizeURL,
						})),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "tokenURL",
						}, "Token URL")),
						m(".col-5", m(Input, {
							id: "tokenURL",
							name: "token_url",
							model: this.tokenURL,
						})),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", "Redirect URL")),
						m(".col-5", [
							m(Input, {
								name: "redirect_uri",
								value: window.location.protocol + "//" + window.location.host + "/x/oauth2-client-verify",
							}),
							m("div", "Ensure that this URL is allowed by the OAuth2 server."),
						]),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "clientID",
						}, "Client ID")),
						m(".col-5", m(Input, {
							id: "clientID",
							name: "client_id",
							model: this.clientID,
						})),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "clientSecret",
						}, "Client Secret")),
						m(".col-5", m(Input, {
							id: "clientSecret",
							name: "client_secret",
							model: this.clientSecret,
						})),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "scope",
						}, "Scope")),
						m(".col-5", m(Input, {
							id: "scope",
							name: "scope",
							model: this.scope,
						})),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "state",
						}, "State")),
						m(".col-5", m(Input, {
							id: "state",
							name: "state",
							model: this.state,
						})),
					]),
					m(".row", m(".col-7.text-end",
						m(Button, { appearance: "primary" }, "Perform OAuth 2.0 Authorization"),
					)),
				],
			),
		])
	}

}

class ResultView implements m.ClassComponent<{ data: any }> {

	view(vnode: m.Vnode<{ data: any }>) {
		return m(".container", [
			m(".hstack", [
				m("h1.flex-grow-1", "OAuth 2.0 Client Auth Result"),
				m(CopyButton, {
					content: (): string => {
						const data = window.btoa(JSON.stringify({}))
						return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
					},
				}, "Copy Permalink"),
			]),
			m("p", "This is incomplete, and a WIP."),
			m("p", "This is the results of an OAuth 2.0 Authorization performed at (WIP). Note that this is dummy/testing stuff. Not to be used for real-world auth scenarios."),
			m("h3", "Authorization Result"),
			m("p", "Code: " + vnode.attrs.data.authorizeResponse.code),
			m("p", "Scope: " + vnode.attrs.data.authorizeResponse.scope),
			m("details", [
				m("summary", m("h3.d-inline-block.m0", "Raw data")),
				m("pre", JSON.stringify(vnode.attrs.data, null, 4)),
			]),
		])
	}

}
