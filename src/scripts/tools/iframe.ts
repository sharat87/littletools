import m from "mithril"
import Stream from "mithril/stream"
import { Input, Button } from "../components"

export default class {
	private locationInput: Stream<string>
	private frameSrc: Stream<string>

	static title = "iframe"

	constructor() {
		this.locationInput = Stream("")
		this.frameSrc = Stream("")
	}

	view() {
		return m(".h100.pa1.flex-v", [
			m(
				"form",
				{
					onsubmit: (event: SubmitEvent) => {
						event.preventDefault()

						const url = this.locationInput()
						if (!url.match(/^[a-z0-9]+:\/\//)) {
							this.locationInput("http://" + url)
						}

						this.frameSrc(this.locationInput())
					},
				},
				[
					m("p.flex-h", [
						m(Input, {
							class: "flex-grow",
							model: this.locationInput,
							placeholder: "Enter URL to open in an iframe below",
						}),
						m(Button, "Go"),
					]),
				],
			),
			m("iframe.flex-grow", {
				src: this.frameSrc(),
			}),
		])
	}
}
