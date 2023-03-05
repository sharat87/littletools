import m from "mithril"
import { ToolView } from "~/src/components"
import { CopyButton } from "../components"

const URL_PREFIX = location.protocol + "//" + location.host

export default class extends ToolView {
	static title = "OIDC Provider"

	mainView(): m.Children {
		return [
			m("p.lead", "This is a ", m("b", "fake"), " Identity Provider (IdP) for OIDC (Open Identity Connect), that you can use to test/troubleshoot your OIDC clients."),
			m("p.text-danger", "Don't use any real credentials, and don't use this in production. "),
			m("p", "Use any dummy client ID and secret, and the following URLs:"),
			m("table.table.table-bordered.table-hover", m("tbody", [
				m("tr", [
					m("th", "Authorize URL"),
					m("td", m(TextWithCopyButton, URL_PREFIX + "/oidc-provider-authorize")),
				]),
				m("tr", [
					m("th", "Token URL"),
					m("td", m(TextWithCopyButton, URL_PREFIX + "/x/oidc/token")),
				]),
				m("tr", [
					m("th", "User Info URL"),
					m("td", m(TextWithCopyButton, URL_PREFIX + "/x/oidc/userinfo")),
				]),
				m("tr", [
					m("th", "JWK Set URL"),
					m("td", m(TextWithCopyButton, URL_PREFIX + "/x/oidc/jwks")),
				]),
			])),
		]
	}

}

class TextWithCopyButton implements m.ClassComponent {
	view(vnode: m.Vnode): m.Children {
		return m(".hstack.gap-2", [
			m(CopyButton, {
				content: vnode.children,
			}),
			m("span", vnode.children),
		])
	}
}
