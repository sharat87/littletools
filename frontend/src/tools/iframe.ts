import m from "mithril"
import Stream from "mithril/stream"
import { Button, Checkbox, Input, PopoverButton, Textarea, ToolView } from "~/src/components"

export default class extends ToolView {
	static title = "iframe"

	private readonly locationInput = Stream("")
	private readonly frameSrc = Stream("")
	private frameEl: null | HTMLIFrameElement = null
	private sandboxEnabled = Stream(false)
	private readonly sandboxOptions = new Set
	private readonly messageToSend = Stream(`"Dummy message"`)

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
							m("code", "frameElement.contentWindow.postMessage("),
							m(Textarea, {
								class: "font-monospace",
								model: this.messageToSend,
							}),
							m("code", ")"),
							m(".alert.alert-danger", "Contents above will be eval-ed. Exercise caution!"),
							m(Button, {
								appearance: "primary",
								onclick: () => {
									this.frameEl?.contentWindow?.postMessage(
										eval(this.messageToSend()),
										this.frameEl?.src,
									)
								},
							}, "Send Message"),
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
