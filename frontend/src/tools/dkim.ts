import m from "mithril"
import { Button, CopyButton, Icon, Input, Textarea, ToolView } from "~/src/components"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import Stream from "mithril/stream"
import { DNS_RR_CODES, resolveDNS } from "../utils"

// TODO: Validate DKIM value and show fixes/suggestions.
// TODO: Paste a DKIM-Signature header to verify.

export default class extends ToolView {
	static title = "DKIM Inspector"

	private domain: Stream<string> = Stream("")
	private selector: Stream<string> = Stream("")
	private editor: null | EditorView = null
	private parsedValue: Record<string, string> = {}
	private showNewModal = false

	constructor() {
		super()
		this.fetchDKIM = this.fetchDKIM.bind(this)
	}

	oncreate(vnode: m.VnodeDOM): void {
		this.editor = new EditorView({
			extensions: [
				keymap.of(defaultKeymap),
				EditorView.updateListener.of(update => {
					if (update.docChanged && this.editor?.hasFocus) {
						this.parseDirectives()
						m.redraw()
					}
				}),
				basicSetup,
			],
			parent: vnode.dom.querySelector(".editor")!,
		})
		this.parseDirectives()
	}

	headerEndView(): m.Children {
		return m(CopyButton, {
			content: () => {
				return location + "?i=" + window.atob(this.getFullInput())
			},
		}, "Permalink")
	}

	mainView(): m.Children {
		const input = this.getFullInput()

		const policyRows = []
		if (this.parsedValue != null) {
			for (const [key, val] of Object.entries(this.parsedValue)) {
				policyRows.push(m("tr", [
					m("td", key),
					m("td", m(Textarea, {
						class: "font-monospace",
						rows: 3,
						value: val,
					})),
				]))
			}
		}

		policyRows.push(m("tr", m("td", { colspan: 2 }, m(Button, {
			appearance: "primary",
			onclick: () => {
				this.showNewModal = true
			},
		}, m.trust("Add Policy&hellip;")))))

		return [
			m("p", "This is a WIP."),
			m("form.hstack.gap-2", {
				onsubmit: (event: Event) => {
					event.preventDefault()
				},
			}, [
				m("label", "Fetch from domain: "),
				m(Input, {
					class: "w-auto",
					model: this.domain,
					placeholder: "Domain",
				}),
				m(".input-group.w-auto", [
					m(Input, {
						class: "w-auto",
						model: this.selector,
						placeholder: "Selector",
					}),
					m(Button, {
						appearance: "outline-info",
						type: "button",
						onclick: () => {
							alert("A domain can have multiple DKIMs specified, each as a TXT record on `selector._domainkey.mydomain.com`, for various values of selector.")
						},
					}, m(Icon, "help")),
				]),
				m(Button, {
					appearance: "outline-primary",
					onclick: this.fetchDKIM,
					type: "submit",
				}, [m(Icon, "cloud_download"), "Fetch"]),
			]),
			m(".mt-3", "Or paste a DKIM value here:"),
			m(".editor"),
			m(".btn-toolbar.my-2.gap-2", [
				m(".btn-group", [
					m(CopyButton, {
						appearance: "outline-primary",
						content: input.replace(/\s+/g, " "),
					}, "One line"),
				]),
			]),
		]
	}

	private async fetchDKIM() {
		const result = await resolveDNS(this.selector() + "._domainkey." + this.domain(), "TXT")
		this.editor?.dispatch({
			changes: {
				from: 0,
				to: this.editor?.state.doc.length,
				insert: result.Answer
					// There can be CNAME records before the TXT record, which we don't need.
					?.filter((record) => record.type === DNS_RR_CODES.TXT)
					.map((record) => record.data)
					.join("\n"),
			},
		})
	}

	private getFullInput() {
		return this.editor?.state.doc.toString() ?? ""
	}

	private parseDirectives() {
		if (this.editor != null) {
			this.parsedValue = {}
			m.redraw()
		}
	}

}
