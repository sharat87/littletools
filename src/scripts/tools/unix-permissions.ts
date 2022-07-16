import m from "mithril"
import { Input } from "../components"

// Alt: <http://permissions-calculator.org>.

export default class {
	ur: boolean
	uw: boolean
	ux: boolean
	gr: boolean
	gw: boolean
	gx: boolean
	or: boolean
	ow: boolean
	ox: boolean

	static title = "Unix File Permissions"

	constructor() {
		this.ur = true
		this.uw = true
		this.ux = true
		this.gr = true
		this.gw = true
		this.gx = false
		this.or = true
		this.ow = false
		this.ox = false
	}

	octal() {
		return [
			"0",
			(this.ur ? 4 : 0) + (this.uw ? 2 : 0) + (this.ux ? 1 : 0),
			(this.gr ? 4 : 0) + (this.gw ? 2 : 0) + (this.gx ? 1 : 0),
			(this.or ? 4 : 0) + (this.ow ? 2 : 0) + (this.ox ? 1 : 0),
		].join("")
	}

	symbolic() {
		return [
			"-",
			this.ur ? "r" : "-",
			this.uw ? "w" : "-",
			this.ux ? "x" : "-",
			this.gr ? "r" : "-",
			this.gw ? "w" : "-",
			this.gx ? "x" : "-",
			this.or ? "r" : "-",
			this.ow ? "w" : "-",
			this.ox ? "x" : "-",
		].join("")
	}

	view() {
		return m(".h100.pa1", [
			m("h1", "Unix File Permission Tool"),
			m("table", [
				m("tr", [
					m("th", ""),
					m("th", "Read"),
					m("th", "Write"),
					m("th", "Execute"),
				]),
				m("tr", [
					m("th", "User"),
					m("td", this.checkbox("ur")),
					m("td", this.checkbox("uw")),
					m("td", this.checkbox("ux")),
				]),
				m("tr", [
					m("th", "Group"),
					m("td", this.checkbox("gr")),
					m("td", this.checkbox("gw")),
					m("td", this.checkbox("gx")),
				]),
				m("tr", [
					m("th", "Others"),
					m("td", this.checkbox("or")),
					m("td", this.checkbox("ow")),
					m("td", this.checkbox("ox")),
				]),
			]),
			m("table", [
				m("tr", [
					m("th", "Format"),
					m("th", "Value"),
				]),
				m("tr", [
					m("th", "Octal"),
					m("td", m("code", this.octal())),
					m(Input, { model: this.octal, pattern: "0[0-7]{3}" }),
				]),
				m("tr", [
					m("th", "Symbolic"),
					m("td", m("code", this.symbolic())),
				]),
			]),
			m("p", "Any of the following commands can be used to set this permissions on a file."),
			m("pre", [
				`chmod ${this.octal()} filepath`,
				`chmod -R ${this.octal()} folderpath  # recursively set permissions`,
			].join("\n")),
		])
	}

	checkbox(field: string): m.Children {
		return m("input", {
			type: "checkbox",
			checked: this[field],
			onchange: (event) => {
				this[field] = event.target.checked
			},
		})
	}
}
