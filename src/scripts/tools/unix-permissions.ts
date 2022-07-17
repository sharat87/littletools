import m from "mithril"
import { Input } from "../components"
import { pad } from "../utils"

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
	octal: string

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
		this.octal = this.computeOctal()
	}

	computeOctal() {
		return [
			"0",
			(this.ur ? 4 : 0) + (this.uw ? 2 : 0) + (this.ux ? 1 : 0),
			(this.gr ? 4 : 0) + (this.gw ? 2 : 0) + (this.gx ? 1 : 0),
			(this.or ? 4 : 0) + (this.ow ? 2 : 0) + (this.ox ? 1 : 0),
		].join("")
	}

	setOctal(value: string) {
		this.octal = value

		if (value.length !== 4) {
			return
		}

		const u = pad(parseInt(value[1], 8).toString(2), "0", 3).split("")
		this.ur = u[0] === "1"
		this.uw = u[1] === "1"
		this.ux = u[2] === "1"

		const g = pad(parseInt(value[2], 8).toString(2), "0", 3).split("")
		this.gr = g[0] === "1"
		this.gw = g[1] === "1"
		this.gx = g[2] === "1"

		const o = pad(parseInt(value[3], 8).toString(2), "0", 3).split("")
		this.or = o[0] === "1"
		this.ow = o[1] === "1"
		this.ox = o[2] === "1"
	}

	computeSymbolic() {
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
					m(Input, {
						value: this.octal,
						pattern: "0[0-7]{3}",
						oninput: (value: string) => {
							this.setOctal(value)
						},
					}),
				]),
				m("tr", [
					m("th", "Symbolic"),
					m("td", m("code", this.computeSymbolic())),
				]),
			]),
			m("p", "Any of the following commands can be used to set this permissions on a file."),
			m("pre", [
				`chmod ${ this.octal } filepath`,
				`chmod -R ${ this.octal } folderpath  # recursively set permissions`,
			].join("\n")),
		])
	}

	checkbox(field: "ur" | "uw" | "ux" | "gr" | "gw" | "gx" | "or" | "ow" | "ox"): m.Children {
		return m("input", {
			type: "checkbox",
			checked: this[field] as boolean,
			onchange: (event: Event) => {
				this[field] = (event.target as HTMLInputElement).checked
			},
		})
	}
}
