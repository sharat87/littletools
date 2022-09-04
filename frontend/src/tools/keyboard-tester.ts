import m from "mithril"
import { Input, ToolView } from "../components"

export default class extends ToolView {
	static title = "Keyboard Tester"

	codes = new Set<string>()

	mainView(): m.Children {
		return [
			m(".row.d-flex.align-items-center", [
				m(".col-auto", m("label", { for: "testerInput" }, m.trust("Focus this input and press a key &rarr;"))),
				m(".col-auto", m(Input, {
					id: "testerInput",
					onkeydown: (event: KeyboardEvent) => {
						event.preventDefault()
						this.codes.add(event.code)
					},
					onkeyup: (event: KeyboardEvent) => {
						// TODO: this event isn't fired for browser shortcuts like `Cmd+Shift+D`.
						event.preventDefault()
						this.codes.delete(event.code)
					},
				})),
			]),
			m("p", Array.from(this.codes).join(", ")),
		]
	}
}
