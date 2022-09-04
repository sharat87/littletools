import m from "mithril"
import { Button, CopyButton, Input, ToolView } from "~/src/components"
import Stream from "mithril/stream"

interface Field {
	name: string
	isFile: Stream<boolean>
	value: string
}

export default class extends ToolView {
	static title = "HTML Form (for CSRF testing)"

	private readonly method = Stream("GET")
	private readonly action = Stream("https://httpbun.com/anything")
	private readonly fields: Field[] = [
		{
			name: "one",
			isFile: Stream(false),
			value: "value one",
		},
		{
			name: "two",
			isFile: Stream(false),
			value: "another value",
		},
	]

	oncreate() {
		const rawData = window.location.search.substring(1)
		if (rawData != null && rawData !== "") {
			const data = JSON.parse(window.atob(rawData))
			this.method(data.method ?? "")
			this.action(data.action ?? "")
			this.fields.splice(0, 0, ...(data.fields ?? []).map((f: any) => ({
				name: f.name,
				isFile: Stream(f.isFile),
				value: f.value,
			})))
			m.redraw()
		}
	}

	headerEndView(): m.Children {
		return m(CopyButton, {
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
		}, "Permalink")
	}

	mainView(): m.Children {
		return [
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
					m("th", "Delete"),
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
						m("td", m(Button, {
							appearance: "outline-danger",
							onclick: (): void => {
								this.fields.splice(index, 1)
							},
						}, "Del")),
					])),
				]),
				m("tfoot", m("tr", m("td", { colspan: 4 }, m(Button, {
					appearance: "outline-primary",
					onclick: (): void => {
						this.fields.push({
							name: "",
							isFile: Stream(false),
							value: "",
						})
					},
				}, "Add Field")))),
			]),
			m(
				"form",
				{
					method: this.method(),
					action: this.action(),
					target: "_blank",
				},
				[
					this.fields.map((field) => m("input.visually-hidden", {
						type: field.isFile() ? "file" : "hidden",
						name: field.name,
						value: field.value,
					})),
					m(Button, { appearance: "primary", size: "lg" }, "Submit this form to a new tab"),
				],
			),
		]
	}

}
