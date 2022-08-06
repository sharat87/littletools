import m from "mithril"
import { CodeBlock, Input } from "../components"
import { pad } from "../utils"

export default class {
	static title = "Unix File Permissions"
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

		if (value.length === 3) {
			value = "0" + value
		}

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
		return m(".container", [
			m("h1", "Unix File Permission Tool"),
			m("table.table.table-bordered.table-hover.w-auto", [
				m("thead", m("tr", [
					m("th", ""),
					m("th", "Read"),
					m("th", "Write"),
					m("th", "Execute"),
				])),
				m("tbody", [
					m("tr", [
						m("th", "User"),
						this.checkbox("ur"),
						this.checkbox("uw"),
						this.checkbox("ux"),
					]),
					m("tr", [
						m("th", "Group"),
						this.checkbox("gr"),
						this.checkbox("gw"),
						this.checkbox("gx"),
					]),
					m("tr", [
						m("th", "Others"),
						this.checkbox("or"),
						this.checkbox("ow"),
						this.checkbox("ox"),
					]),
				]),
			]),
			m("form", m(".row.mv-3", [
				m("label.col-sm-1.col-form-label", { for: "octalInput" }, "Octal:"),
				m(".col-auto", m(Input, {
					id: "octalInput",
					value: this.octal,
					pattern: "0[0-7]{3}",
					minlength: 3,
					maxlength: 4,
					onChange: (value: string) => {
						this.setOctal(value)
					},
				})),
			])),
			m("form", m(".row.mv-3", [
				m("label.col-sm-1.col-form-label", { for: "octalInput" }, "Symbolic:"),
				m(".col-auto", m("code.form-control-plaintext", this.computeSymbolic())),
			])),
			m("h2.mt-4", "chmod Commands"),
			m("p", "Any of the following commands can be used to set this permissions on a file."),
			m(CodeBlock, `chmod ${ pad(this.octal, "0", 4) } filepath`),
			m(CodeBlock, `chmod -R ${ pad(this.octal, "0", 4) } folderpath  # recursively set permissions`),
		])
	}

	checkbox(field: "ur" | "uw" | "ux" | "gr" | "gw" | "gx" | "or" | "ow" | "ox"): m.Children {
		return m("td.p-0", m("label.w-100.h-100.d-block.text-center.p-2", m("input", {
			type: "checkbox",
			checked: this[field] as boolean,
			onchange: (event: Event) => {
				this[field] = (event.target as HTMLInputElement).checked
			},
		})))
	}
}
