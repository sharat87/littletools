import m from "mithril"
import Stream from "mithril/stream"
import { CopyButton, Form, Icon, TextWithCopyButton, ToolView } from "~/src/components"
import { request } from "~/src/utils"

const URL_PREFIX = location.protocol + "//" + location.host

export default class extends ToolView {
	static title = "SAML Provider"

	private readonly bindings: Stream<string> = Stream("gp")
	private readonly relayState: Stream<string> = Stream("forward")
	private readonly metadataURL: Stream<string>

	constructor() {
		super()
		this.metadataURL = Stream.lift((bindings, relayState) => {
			return URL_PREFIX + "/x/saml/metadata/" + window.btoa(JSON.stringify({
				sso: bindings,
				slo: bindings,
				relayState: relayState,
			}))
		}, this.bindings, this.relayState)
	}

	mainView(): m.Children {
		return [
			m("p.lead", "This is a ", m("b", "fake"), " Identity Provider (IdP) for SAML based authentication, that you can use to test/troubleshoot your SAML Service Providers (SP)."),
			m("p.text-danger", "Don't use any real credentials, and don't use this in production."),
			m("p", "Signatures and encryption are not supported."),
			m(".card", [
				m(".card-header", ["Metadata URL", m("span.text-secondary", ", also known as "), "SAML Entity Descriptor URL"]),
				m(".card-body", [
					m(TextWithCopyButton, {
						wrapper: "span[data-testid=metadata-url]",
						text: this.metadataURL(),
					}),
					m(".hstack.gap-2", [
						m(CopyButton, {
							appearance: "outline-secondary",
							size: "sm",
							class: "mt-2",
							content: this.metadataURL(),
						}, "Copy Metadata URL"),
						m(CopyButton, {
							appearance: "outline-secondary",
							size: "sm",
							class: "mt-2",
							content: () => {
								return request(this.metadataURL(), {
									responseType: "text",
								})
							},
						}, "Copy Full Metadata XML"),
					]),
				]),
			]),
			m("details.mt-2", [
				m("summary.fs-5", "Configure IdP Behaviour"),
				m("p.alert.alert-info.my-1", [
					m(Icon, { class: "me-1" }, "info"),
					"Remember to copy the metadata URL again ",
					m("strong", "after"),
					" changing the configuration.",
				]),
				m(Form, {
					id: "saml-idp-config",
					fields: [
						Form.radioField("Bindings", this.bindings, {
							p: "HTTP-POST",
							g: "HTTP-Redirect",
							gp: "Both HTTP-POST and HTTP-Redirect",
						}),
						Form.radioField("RelayState", this.relayState, {
							forward: "Forward",
							drop: "Drop",
							mangle: "Forward incorrect value",
						}),
					],
				}),
			]),
		]
	}

}
