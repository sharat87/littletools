import m from "mithril"
import { CopyButton, ToolView } from "~/src/components"

// TODO: Include a link to the OAuth client tool, with values prefilled from this result.

export default class extends ToolView {
	static title = "OAuth 2.0 Client Result"
	static isHidden = true

	private data: any = null

	oncreate() {
		const rawData = window.location.search.substring(1)
		if (rawData != null && rawData != "") {
			this.data = JSON.parse(window.atob(rawData))
			m.redraw()
		}
	}

	headerEndView(): m.Children {
		return m(CopyButton, {
			content: (): string => {
				const data = window.btoa(JSON.stringify({}))
				return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
			},
		}, "Permalink")
	}

	/*
	Example data structure:
	{
		"authorizeResponse": {
			"code": "1234",
			"scope": ""
		},
		"state": {
			"authorizeURL": "given-authorize-url",
			"clientID": "dummy-client-id",
			"clientSecret": "dummy-client-secret",
			"redirectURI": "http://localhost:3060/x/oauth2-client-verify",
			"state": "",
			"tokenURL": "given-token-url"
		},
		"tokenResponse": {
			"body": "access_token=dummy-access-token&scope=&token_type=bearer",
			"contentType": "application/x-www-form-urlencoded; charset=utf-8"
		},
		"view": "result"
	}
	 */

	mainView() {
		const { data } = this
		return data && [
			m("p", "This is the result of an OAuth 2.0 Authorization performed at (WIP). Note that this is a developer tool. Not to be used for production stuff."),
			m("h3", "1. Authorization Result"),
			m("p", ["First, we made the Authorization request to ", m("code", data.state.authorizeURL), ". We received:"]),
			m("table.table.table-bordered.w-auto", [
				m("tbody", [
					m("tr", [
						m("th", "Code"),
						m("td", data.authorizeResponse.code ? m("code", data.authorizeResponse.code) : m("em", "None")),
					]),
					m("tr", [
						m("th", "Scope"),
						m("td", data.authorizeResponse.scope ? m("code", data.authorizeResponse.scope) : m("em", "None")),
					]),
				]),
			]),
			m("h3", "2. Access Token Result"),
			m("p", ["Second, we made the Access Token request to ", m("code", data.state.tokenURL), ". We received:"]),
			m("table.table.table-bordered.w-auto", [
				m("tbody", [
					m("tr", [
						m("th", "Content-Type"),
						m("td", data.tokenResponse.contentType ? m("code", data.tokenResponse.contentType) : m("em", "None")),
					]),
					m("tr", [
						m("th", "Body"),
						m("td", data.tokenResponse.body ? m("code", data.tokenResponse.body) : m("em", "None")),
					]),
				]),
			]),
			m("details", [
				m("summary", m(".d-inline-block.mt-3", "Raw data")),
				m("pre", JSON.stringify(data, null, 4)),
			]),
		]
	}

}
