import m from "mithril"
import Stream from "mithril/stream"
import { Button, Input } from "../components"

export default class {
	private readonly locationInput: Stream<string>
	private readonly frameSrc: Stream<string>

	static title = "iframe"

	constructor() {
		this.locationInput = Stream("")
		this.frameSrc = Stream("")
	}

	view() {
		return m(".container.h-100.flex-v", [
			m("h1", "iframe Tester"),
			m(
				"form.row",
				{
					onsubmit: (event: SubmitEvent) => {
						event.preventDefault()

						const url = this.locationInput()
						if (!url.match(/^https?:\/\//)) {
							this.locationInput("http://" + url)
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
					m(".col-auto", m(Button, "Load in iframe")),
				],
			),
			m("iframe.flex-grow.my-2.border", {
				src: this.frameSrc(),
			}),
		])
	}
}
