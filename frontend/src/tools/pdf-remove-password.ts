import m from "mithril"
import { Button, Form, Input, ToolView } from "~src/components"

// TODO: Error reporting, for when the password is incorrect, etc.
// TODO: Support processing multiple PDFs at once.

export default class extends ToolView {
	static title = "PDF Remove Password"
	static acceptsDroppedFiles = true

	private isLoading: boolean = false

	mainView(): m.Children {
		return [
			m("p", "Select a password-protected PDF file, enter the correct password, and download the same PDF that doesn't need a password to open."),
			m(Form, {
				id: "pdf-remove-password",
				method: "POST",
				action: "/x/pdf-remove-password",
				onsubmit: () => {
					this.isLoading = true
				},
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
				buttons: () => m(Button, {
					appearance: "primary",
					isLoading: this.isLoading
				}, "Download PDF without password"),
			}),
			m("iframe.col-7", {
				name: "targetFrame",
			}),
		]
	}

	openDataTransfer(dt: DataTransfer) {
		// Abstraction leak.
		(document.querySelector("input[type=file]") as HTMLInputElement).files = dt.files
	}

}
