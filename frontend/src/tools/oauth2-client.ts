import m from "mithril"
import { Button, CopyButton, Input, ToolView } from "~/src/components"
import Stream from "mithril/stream"

export default class extends ToolView {
	static title = "OAuth 2.0 Client"

	private readonly authorizeURL: Stream<string> = Stream("https://httpbun.com/oauth/authorize")
	private readonly tokenURL: Stream<string> = Stream("")
	private readonly clientID: Stream<string> = Stream("client-id-dummy")
	private readonly clientSecret: Stream<string> = Stream("client-secret-dummy")
	private readonly scope: Stream<string> = Stream("")
	private readonly state: Stream<string> = Stream("")

	constructor() {
		super()
		this.loadPreset = this.loadPreset.bind(this)
	}

	oncreate() {
		const rawData = window.location.search.substring(1)
		if (rawData != null && rawData != "") {
			const data = JSON.parse(window.atob(rawData))
			if (data.authorizeURL != null && data.authorizeURL != this.authorizeURL()) {
				this.authorizeURL(data.authorizeURL)
			}
			if (data.tokenURL != null && data.tokenURL != this.tokenURL()) {
				this.tokenURL(data.tokenURL)
			}
			if (data.clientID != null && data.clientID != this.clientID()) {
				this.clientID(data.clientID)
			}
			if (data.clientSecret != null && data.clientSecret != this.clientSecret()) {
				this.clientSecret(data.clientSecret)
			}
			if (data.scope != null && data.scope != this.scope()) {
				this.scope(data.scope)
			}
			if (data.state != null && data.state != this.state()) {
				this.state(data.state)
			}
			m.redraw()
		}
	}

	headerEndView(): m.Children {
		return m(CopyButton, {
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
		}, "Permalink")
	}

	mainView(): m.Children {
		return [
			m("p", "Perform an OAuth 2.0 based dummy Authorization with the following configuration. Note that the resulting access token is not saved by LittleTools, and will be visible here in plain-text, once auth is done."),
			m("p.hstack.gap-2", [
				"URL Presets: ",
				m(".btn-group.btn-group-sm", [
					m(Button, { appearance: "light", onclick: this.loadPreset }, "GitHub"),
					m(Button, { appearance: "light", onclick: this.loadPreset }, "Google"),
					m(Button, { appearance: "light", onclick: this.loadPreset }, "Twitter"),
				]),
			]),
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
							name: "authorize_url",
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
							autocomplete: "off",
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
					m(".row", [
						m(".col-2.text-end", ""),
						m(".col-7.text-end",
							m(Button, { appearance: "primary" }, "Perform OAuth 2.0 Authorization"),
						),
					]),
				],
			),
		]
	}

	loadPreset(e: Event): void {
		const preset = (e.target as HTMLButtonElement).textContent?.toLowerCase()
		if (preset === "github") {
			this.authorizeURL("https://github.com/login/oauth/authorize")
			this.tokenURL("https://github.com/login/oauth/access_token")
		} else if (preset === "google") {
			this.authorizeURL("https://accounts.google.com/o/oauth2/v2/auth")
			this.tokenURL("https://oauth2.googleapis.com/token")
		} else if (preset === "twitter") {
			this.authorizeURL("https://api.twitter.com/oauth/authorize")
			this.tokenURL("https://api.twitter.com/oauth/access_token")
		}
	}

}
