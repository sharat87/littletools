import m from "mithril"
import { ToolView } from "~/src/components"
import { CopyButton } from "../components"

const URL_PREFIX = location.protocol + "//" + location.host

export default class extends ToolView {
	static title = "SAML Provider (Beta)"

	mainView(): m.Children {
		return [
			m("p.lead", "This is a ", m("b", "fake"), " Identity Provider (IdP) for SAML based authentication, that you can use to test/troubleshoot your SAML Service Providers (SP)."),
			m("p.text-danger", "Don't use any real credentials, and don't use this in production. "),
			m(".card", [
				m(".card-header", ["Metadata URL", m("span.text-secondary", ", also known as "), "SAML Entity Descriptor URL"]),
				m(".card-body", m(TextWithCopyButton, URL_PREFIX + "/x/saml/metadata")),
			]),
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
