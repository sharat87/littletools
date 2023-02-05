import m from "mithril"
import { Button, Form, Input, ToolView } from "~src/components"

// TODO: Error reporting, for when the password is incorrect, etc.
// TODO: Support processing multiple PDFs at once.
// TODO: "Show password" button next to the password input.

export default class extends ToolView {
	static title = "PDF Remove Password"

	mainView(): m.Children {
		return [
			m("p", "Select a password-protected PDF file, enter the correct password, and download the same PDF that doesn't need a password to open."),
			m(Form, {
				id: "pdf-remove-password",
				method: "POST",
				action: "/x/pdf-remove-password",
				target: "targetFrame",
				fields: [
					Form.field("Encrypted PDF", () => m(Input, {
						name: "pdfFile",
						type: "file",
						required: true,
					})),
					Form.field("Password", () => m(Input, {
						name: "password",
						type: "password",
						required: true,
					})),
				],
				buttons: () => m(Button, { appearance: "primary" }, "Download PDF without password"),
			}),
			m("iframe.col-7", {
				name: "targetFrame",
			}),
		]
	}

}
