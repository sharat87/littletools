import m from "mithril"

export default class {
	content: string

	static title = "JSON Formatter"

	constructor() {
		this.content = ""
	}

	view() {
		return m(".h100.pa1", [
			m("h1", "JSON Formatter Tool"),
			m("textarea", {
				autofocus: true,
				rows: 20,
				value: this.content,
				oninput: (event) => {
					this.content = event.target.value
				},
			}),
			m("p", [
				m(
					"button",
					{
						onclick: () => {
							this.content = JSON.stringify(JSON.parse(this.content), null, 2)
						},
					},
					"Format JSON",
				),
				m(
					"button",
					{
						onclick: () => {
							alert("Coming soon")
						},
					},
					"Sort keys in all objects",
				),
			]),
		])
	}

}
