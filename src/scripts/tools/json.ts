import m from "mithril"
import { Button, Textarea } from "../components"

export default class {
	content: string

	static title = "JSON Formatter"

	constructor() {
		this.content = ""
	}

	view() {
		return m(".container.h-100.d-flex.flex-column", [
			m("h1", "JSON Formatter Tool"),
			m(Textarea, {
				class: "font-monospace flex-grow-1",
				placeholder: "Enter JSON here",
				value: this.content,
				onChange: (value: string) => {
					this.content = value
				},
				onkeydown: (event: KeyboardEvent) => {
					if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
						this.format()
					}
				},
			}),
			m(".btn-toolbar.my-2", m(".btn-group", [
				m(
					Button,
					{
						onclick: () => {
							this.format()
						},
					},
					"Format JSON",
				),
				m(
					Button,
					{
						onclick: () => {
							alert("Coming soon")
						},
					},
					"Sort keys in all objects",
				),
			])),
		])
	}

	format() {
		this.content = JSON.stringify(JSON.parse(this.content), null, 4).trim() + "\n"
	}

}
