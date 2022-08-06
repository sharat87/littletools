import m from "mithril"
import { Input } from "../components"

export default class {
	static title = "Keyboard Tester"

	codes: Set<string>

	constructor() {
		this.codes = new Set()
	}

	view() {
		return m(".container", [
			m("h1", "Keyboard Tester"),
			m(".row.d-flex.align-items-center", [
				m(".col-auto", m("label", { for: "testerInput" }, m.trust("Focus this input and press a key &rarr;"))),
				m(".col-auto", m(Input, {
					id: "testerInput",
					onkeydown: (event: KeyboardEvent) => {
						this.codes.add(event.code)
					},
					onkeyup: (event: KeyboardEvent) => {
						this.codes.delete(event.code)
					},
				})),
			]),
			m("p", Array.from(this.codes).join(", ")),
		])
	}
}
