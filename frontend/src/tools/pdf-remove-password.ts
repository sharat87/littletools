import m from "mithril"
import { Button, ToolView } from "~/src/components"

// TODO: Error reporting, for when the password is incorrect, etc.
// TODO: Support processing multiple PDFs at once.
// TODO: "Show password" button next to the password input.

export default class extends ToolView {
	static title = "PDF Remove Password"

	mainView(): m.Children {
		return [
			m("p", "This is a WIP, but should work in most cases."),
			m(
				"form.vstack.gap-3",
				{
					method: "POST",
					action: "/x/pdf-remove-password",
					enctype: "multipart/form-data",
					target: "targetFrame",
				},
				[
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "pdfFile",
						}, "Encrypted PDF File")),
						m(".col-5", m("input.form-control", {
							id: "pdfFile",
							name: "pdfFile",
							type: "file",
							required: true,
						})),
					]),
					m(".row", [
						m(".col-2.text-end", m("label.col-form-label", {
							for: "password",
						}, "Password")),
						m(".col-5", m("input.form-control", {
							id: "password",
							name: "password",
							type: "password",
							required: true,
						})),
					]),
					m(".row", m(".col-7.text-end",
						m(Button, { appearance: "primary" }, "Download PDF without password"),
					)),
				],
			),
			m("iframe.col-7", {
				name: "targetFrame",
			}),
		]
	}

}
