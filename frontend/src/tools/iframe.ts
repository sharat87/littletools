import m from "mithril"
import Stream from "mithril/stream"
import { Button, Input } from "~/src/components"

export default class {
	private readonly locationInput: Stream<string>
	private readonly frameSrc: Stream<string>
	private frameEl: null | HTMLIFrameElement

	static title = "iframe"

	constructor() {
		this.locationInput = Stream("")
		this.frameSrc = Stream("")
		this.frameEl = null
	}

	view() {
		return m(".container.h-100.d-flex.flex-column", [
			m("h1", "iframe Tester"),
			m(
				"form.row",
				{
					onsubmit: (event: SubmitEvent) => {
						event.preventDefault()

						const url = this.locationInput()
						if (!url.match(/^https?:\/\//)) {
							this.locationInput(window.location.protocol + "//" + url)
						}

						this.frameSrc(this.locationInput())
					},
				},
				[
					m(".col-sm-7", m(Input, {
						class: "form-control",
						model: this.locationInput,
						placeholder: "Enter URL to open in iframe below",
					})),
					m(".col-auto", m(Button, "Go")),
					m(".col-auto", m(Button, {
						type: "button",
						onclick: () => {
							this.frameSrc("")
							setTimeout(() => {
								this.frameSrc(this.locationInput())
								m.redraw()
							})
						},
					}, "Reload")),
					m(".col-auto", m(Button, {
						onclick: () => {
							console.log(this.frameEl)
							console.log(this.frameEl?.contentWindow)
							this.frameEl?.contentWindow?.postMessage(
								"Dummy sample string message",
								this.frameEl?.src,
							)
						},
					}, "Send Message")),
				],
			),
			m("iframe.flex-grow-1.my-2.border", {
				src: this.frameSrc(),
				oncreate: (vnode: m.VnodeDOM<any, any>): any => {
					this.frameEl = vnode.dom as HTMLIFrameElement
				},
			}),
		])
	}
}
