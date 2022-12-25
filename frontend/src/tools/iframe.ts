import m from "mithril"
import Stream from "mithril/stream"
import { Button, Checkbox, Input, PopoverButton, ToolView } from "~/src/components"
import { cmdEnterKeymap, indirectEval } from "../utils"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { LanguageSupport } from "@codemirror/language"
import { customJSONLang } from "./json"

export default class extends ToolView {
	static title = "iframe"

	private readonly locationInput = Stream("")
	private readonly frameSrc = Stream("")
	private frameEl: null | HTMLIFrameElement = null
	private sandboxEnabled = Stream(false)
	private readonly sandboxOptions = new Set

	mainView(): m.Children {
		return [
			m(
				"form.hstack.gap-3",
				{
					onsubmit: (event: SubmitEvent) => {
						event.preventDefault()

						const url = this.locationInput()
						if (!url.match(/^(https?:\/\/|data:)/)) {
							this.locationInput(window.location.protocol + "//" + url)
						}

						this.frameSrc(this.locationInput())
					},
				},
				[
					m(".input-group.flex-grow-1.w-auto", [
						m(Input, {
							model: this.locationInput,
							placeholder: "Enter URL to open in iframe below",
						}),
						m(Button, { appearance: "primary" }, "Go"),
					]),
					m(Button, {
						type: "button",
						appearance: "outline-primary",
						onclick: () => {
							this.frameSrc("")
							setTimeout(() => {
								this.frameSrc(this.locationInput())
								m.redraw()
							})
						},
					}, "Reload"),
					m(PopoverButton, {
						appearance: "outline-primary",
						popoverView: () => m(".popover-body.vstack", [
							m(Checkbox, {
								id: "sandboxEnabled",
								model: this.sandboxEnabled,
							}, "Enable sandbox attribute"),
							m("p", m("a", {
								target: "_blank",
								href: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox",
							}, "Learn more on MDN")),
							this.sandboxOptionCheckbox("allow-downloads-without-user-activation"),
							this.sandboxOptionCheckbox("allow-downloads"),
							this.sandboxOptionCheckbox("allow-forms"),
							this.sandboxOptionCheckbox("allow-modals"),
							this.sandboxOptionCheckbox("allow-orientation-lock"),
							this.sandboxOptionCheckbox("allow-pointer-lock"),
							this.sandboxOptionCheckbox("allow-popups"),
							this.sandboxOptionCheckbox("allow-popups-to-escape-sandbox"),
							this.sandboxOptionCheckbox("allow-presentation"),
							this.sandboxOptionCheckbox("allow-same-origin"),
							this.sandboxOptionCheckbox("allow-scripts"),
							this.sandboxOptionCheckbox("allow-storage-access-by-user-activation"),
							this.sandboxOptionCheckbox("allow-top-navigation"),
							this.sandboxOptionCheckbox("allow-top-navigation-by-user-activation"),
						]),
					}, m.trust("Sandbox&hellip;")),
					m(PopoverButton, {
						width: 400,
						appearance: "outline-primary",
						popoverView: () => m(".popover-body.vstack", [
							m("code.mb-1", "frameElement.contentWindow.postMessage("),
							m(".editor-spot", {
								oncreate: (vnode) => {
									const spot = vnode.dom
									const editor = new EditorView({
										doc: `"Dummy Message"`,
										extensions: [
											keymap.of(defaultKeymap),
											cmdEnterKeymap((_: EditorView) => {
												this.frameEl?.contentWindow?.postMessage(
													// Parentheses are required to make it a valid expression. Otherwise, inputs like `{a:1}` will fail.
													indirectEval("(" + editor.state.doc.toString() + ")"),
													this.frameEl?.src,
												)
												return true
											}),
											basicSetup,
											new LanguageSupport(customJSONLang),
										],
									})
									spot.replaceWith(editor.dom)
									editor.dom.style.minHeight = "6em"
									editor.dom.style.maxHeight = "70vh"
									editor.focus()
								},
							}),
							m("code.mt-1", ")"),
							m("p.my-2", "Hit ", m("code", "Ctrl+Enter"), " to send the message."),
							m(".alert.alert-danger.mb-0", "Contents above will be eval-ed. Exercise caution!"),
						]),
					}, m.trust("Send Message&hellip;")),
				],
			),
			m("iframe.flex-grow-1.my-2.border.border-warning.border-4.rounded", {
				src: this.frameSrc(),
				sandbox: this.sandboxEnabled() ? Array.from(this.sandboxOptions).join(" ") : undefined,
				oncreate: (vnode: m.VnodeDOM<any, any>): any => {
					this.frameEl = vnode.dom as HTMLIFrameElement
				},
			}),
		]
	}

	private sandboxOptionCheckbox(option: string) {
		return m(Checkbox, {
			id: option + "-checkbox",
			disabled: !this.sandboxEnabled(),
			value: this.sandboxOptions.has(option),
			onChange: (value) => {
				if (value) {
					this.sandboxOptions.add(option)
				} else {
					this.sandboxOptions.delete(option)
				}
			},
		}, option)
	}
}
