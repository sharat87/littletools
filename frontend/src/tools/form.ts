import m from "mithril"
import { Button, CopyButton, Input, ToolView } from "~/src/components"
import Stream from "mithril/stream"
import { downloadText } from "../utils"
import template from "lodash/template"
// @ts-ignore
import formTemplateStr from "~/src/templates/form-generated-html.html.ejs"

interface Field {
	name: string
	isFile: Stream<boolean>
	value: string
}

export default class extends ToolView {
	static title = "HTML Form (for CSRF testing)"

	private readonly method = Stream("GET")
	private readonly action = Stream("https://httpbun.com/anything")
	// private readonly type = Stream("application/x-www-form-urlencoded")
	private readonly enctype = Stream("multipart/form-data")
	private fields: Field[] = [
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

	private formTemplate: any = null

	oncreate() {
		const rawData = window.location.search.substring(1)
		if (rawData != null && rawData !== "") {
			const data = JSON.parse(window.atob(rawData))
			this.method(data.method ?? "")
			this.action(data.action ?? "")
			this.fields = (data.fields ?? []).map((f: any) => ({
				name: f.name,
				isFile: Stream(f.isFile),
				value: f.value,
			}))
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
				m(".col-5", ["GET", "POST"].map(method => m(".form-check.form-check-inline", [
					m("input.form-check-input", {
						type: "radio",
						id: "method-" + method,
						name: "method",
						value: method,
						checked: this.method() === method,
						onchange: () => this.method(method),
					}),
					m("label.form-check-label", { for: "method-" + method }, method),
				]))),
			]),
			m(".mb-3.row", [
				m(".col-1", m("label.col-form-label", "Action")),
				m(".col-5", m(Input, {
					model: this.action,
				})),
			]),
			m(".mb-3.row", [
				m(".col-1", m("label.col-form-label", "Type")),
				m(".col-7", ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"].map(enctype => m(".form-check.form-check-inline", [
					m("input.form-check-input", {
						type: "radio",
						id: "enctype-" + enctype,
						name: "enctype",
						value: enctype,
						checked: this.enctype() === enctype,
						onchange: () => this.enctype(enctype),
					}),
					m("label.form-check-label", { for: "enctype-" + enctype }, enctype),
				]))),
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
					enctype: this.enctype(),
					target: "_blank",
				},
				[
					this.fields.map((field) => {
						return m("input.visually-hidden", {
							type: field.isFile() ? "file" : "hidden",
							name: field.name,
							value: field.isFile() ? undefined : field.value,
							...(field.isFile() && {
								oncreate: updateFileValues,
								onupdate: updateFileValues,
							}),
						})

						function updateFileValues(vnode: m.VnodeDOM<any, any>) {
							if (field.isFile()) {
								const input = vnode.dom as HTMLInputElement
								const file = new File([field.value], field.name)
								const container = new DataTransfer()
								container.items.add(file)
								input.files = container.files
							}
						}
					}),
					m(".btn-group", [
						m(Button, { appearance: "primary" }, "Submit this form to a new tab"),
						m(Button, {
							appearance: "outline-primary",
							type: "button",
							onclick: (): void => {
								downloadText(this.makeFormHTML(), "form.html")
							},
						}, "Download HTML file with this form (beta)"),
					]),
				],
			),
		]
	}

	makeFormHTML(): string {
		if (this.formTemplate == null) {
			this.formTemplate = template(formTemplateStr)
		}

		// TODO: File fields don't get the value populated. Need some Javascript magic for that.
		return this.formTemplate({
			method: this.method(),
			action: this.action(),
			enctype: this.enctype(),
			fields: this.fields,
			escapeForHTMLAttribute,
		})
	}

}

function escapeForHTMLAttribute(value: string): string {
	return value.replace(/"/g, "&quot;")
}
