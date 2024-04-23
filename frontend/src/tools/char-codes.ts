import m from "mithril"
import { ToolView } from "../components"
import { copyToClipboard } from "../utils"

interface Char {
	code: number
	char: string
	hex: string
	oct: string
}

const CHARS: Char[] = Array.from({ length: 128 }, (_, code: number): Char => ({
	code,
	char: String.fromCharCode(code),
	hex: code.toString(16).toUpperCase().padStart(2, "0"),
	oct: code.toString(8).padStart(3, "0"),
}))

function toLangSyntax(lang: string, { code }: { code: number }): m.ChildArray {
	switch (lang) {
		case "go":
			return [
				m("td", m("code", `"\\x${ code.toString(16).padStart(2, "0") }"`)),
				m("td", m("code", `"\\o${ code.toString(8).padStart(3, "0") }"`)),
			]
		case "java":
			return [
				m("td", m("code", `"\\x${ code.toString(16).padStart(2, "0") }"`)),
				m("td", m("code", `"\\${ code.toString(8).padStart(3, "0") }"`)),
			]
	}

	return [m("td", "NA")]
}

export default class extends ToolView {
	static title = "Character Codes"

	private lang = "java"

	constructor() {
		super()
		this.onLangChanged = this.onLangChanged.bind(this)
	}

	mainView(): m.Children {
		return [
			m("p.lead", "Just a subtly more useful ASCII table. Most things are click-to-copy."),
			m("table.table.mb-5.copyable-cells", [
				m("thead", [
					m("tr", [
						m("th", "Char"),
						m("th", "DEC"),
						m("th", "OCT"),
						m("th", "HEX"),
						m("th", { colspan: toLangSyntax(this.lang, { code: 0 }).length }, m("select.w-100", {
							value: this.lang,
							onchange: this.onLangChanged
						}, [
							m("option", { value: "go" }, "Go String"),
							m("option", { value: "java" }, "Java String"),
							m("option", { value: "javascript" }, "JavaScript"),
							m("option", { value: "python" }, "Python"),
						])),
					]),
				]),
				m("tbody.font-monospace", {
					onclick: (event: Event) => {
						const target = event.target as HTMLElement
						copyToClipboard(target.textContent ?? "", target)
					},
				}, CHARS.map((c: Char) => m("tr", [
					m("td", c.char),
					m("td", c.code),
					m("td", c.oct),
					m("td", c.hex),
					toLangSyntax(this.lang, c),
				]))),
			]),
		]

	}

	onLangChanged(e: Event) {
		this.lang = (e.target as HTMLSelectElement).value
	}

}
