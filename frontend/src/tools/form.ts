import m from "mithril"
import { Button, CopyButton, Input } from "~/src/components"
import Stream from "mithril/stream"

interface Field {
	name: string
	isFile: Stream<boolean>
	value: string
}

export default class implements m.ClassComponent {
	static title = "HTML Form"

	private readonly method: Stream<string>
	private readonly action: Stream<string>
	private readonly fields: Field[]

	constructor() {
		this.method = Stream("GET")
		this.action = Stream("https://httpbun.com/anything")
		this.fields = []
	}

	oncreate() {
		const rawData = window.location.search
		if (rawData != null) {
			const data = JSON.parse(window.atob(rawData.substring(1)))
			this.method(data.method)
			this.action(data.action)
			this.fields.splice(0, 0, ...data.fields.map((f: any) => ({
				name: f.name,
				isFile: Stream(f.isFile),
				value: f.value,
			})))
			m.redraw()
		}
	}

	view() {
		return m(".container.h-100.d-flex.flex-column.vstack", [
			m(".hstack", [
				m("h1.flex-grow-1", "HTML Form"),
				m(CopyButton, {
					size: "sm",
					appearance: "outline-secondary",
					content: (): string => {
						const data = window.btoa(JSON.stringify({
							method: this.method(),
							action: this.action(),
							fields: this.fields.map(f => ({
								name: f.name,
								isFile: f.isFile(),
								value: f.value,
							})),
						}))
						return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
					},
				}, "Copy Permalink"),
			]),
			m("p", "This is a WIP (files not supported yet). This tool can be used to craft forms with specific names and values to be submitted to any website. It can be used to test CSRF attacks."),
			m(".mb-3.row", [
				m(".col-1", m("label.col-form-label", "Method")),
				m(".col-5", m(Input, {
					model: this.method,
					list: "methods",
				})),
				m("datalist#methods", [
					m("option", { value: "GET" }),
					m("option", { value: "POST" }),
					m("option", { value: "PUT" }),
					m("option", { value: "DELETE" }),
					m("option", { value: "PATCH" }),
				]),
			]),
			m(".mb-3.row", [
				m(".col-1", m("label.col-form-label", "Action")),
				m(".col-5", m(Input, {
					model: this.action,
				})),
			]),
			m("table.table.table-bordered.align-middle", [
				m("thead", m("tr", [
					m("th", "Name"),
					m("th", "Type"),
					m("th", "Value"),
				])),
				m("tbody", [
					...this.fields.map((field, index) => m("tr", [
						m("td", m(Input, {
							value: field.name,
							onChange: (value: string): void => {
								field.name = value
							},
						})),
						m("td", [
							m(Input, {
								id: `isFile${ index }`,
								type: "checkbox",
								model: field.isFile,
							}),
							m("label.ms-2", {
								for: `isFile${ index }`,
							}, "Is File?"),
						]),
						m("td", m(Input, {
							value: field.value,
							onChange: (value: string): void => {
								field.value = value
							},
						})),
					])),
					m("tr", m("td", { colspan: 3 }, m(Button, {
						appearance: "outline-primary",
						onclick: (): void => {
							this.fields.push({
								name: "",
								isFile: Stream(false),
								value: "",
							})
						},
					}, "Add Field"))),
				]),
			]),
			m(
				"form",
				{
					method: this.method(),
					action: this.action(),
					target: "_blank",
				},
				[
					this.fields.map((field, index) => m("input.visually-hidden", {
						type: field.isFile() ? "file" : "hidden",
						name: field.name,
						value: field.value,
					})),
					m(Button, { size: "lg" }, "Submit this form to a new tab"),
				],
			),
		])
	}

}
