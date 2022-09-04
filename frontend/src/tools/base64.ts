import m from "mithril"
import { CopyButton, Textarea, ToolView } from "../components"

export default class extends ToolView {
	static title = "Base64 Encode/Decode"
	static acceptsDroppedFiles = true

	private mode: null | string = null
	private encoded: string = ""
	private encodedDataUri: string = ""
	private decoded: string = ""

	mainView(): m.Children {
		let decodedType: string
		let decodedView: m.Children

		// Image identification from base64 from <https://stackoverflow.com/a/50111377/151048>.
		if (this.encoded[0] === "i") {
			decodedType = "PNG Image"
			decodedView = m("img", {
				src: "data:image/png;base64," + this.encoded,
			})

		} else if (this.encoded[0] === "/") {
			decodedType = "JPEG Image"
			decodedView = m("img", {
				src: "data:image/jpg;base64," + this.encoded,
			})

		} else if (this.encoded[0] === "R") {
			decodedType = "GIF Image"
			decodedView = m("img", {
				src: "data:image/gif;base64," + this.encoded,
			})

		} else if (this.encoded[0] === "U") {
			decodedType = "WEBP Image"
			decodedView = m("img", {
				src: "data:image/webp;base64," + this.encoded,
			})

		} else {
			decodedType = "Plain text"
			decodedView = m(Textarea, {
				id: "decodedInput",
				class: "flex-grow-1",
				placeholder: "Decoded plain text here",
				value: this.decoded,
				onfocus: () => {
					this.mode = "encode"
				},
				onChange: (value: string) => {
					if (this.mode === "encode") {
						this.decoded = value
						this.encoded = window.btoa(this.decoded)
					}
				},
			})

		}

		return [
			m("p", "Supports both text and images. Go on, drop an image file here. Arbitrary binary files support coming soon."),
			m(".hstack.justify-content-between.gap-3", [
				m("label.fs-3", {
					for: "encodedInput",
					class: "form-label",
				}, "Encoded:"),
				m(".btn-toolbar.my-2", m(".btn-group", [
					m(CopyButton, { appearance: "outline-secondary", size: "sm", content: this.encoded }),
					m(CopyButton, {
						appearance: "outline-secondary",
						size: "sm",
						content: this.encodedDataUri,
					}, "Data URL"),
				])),
			]),
			m(Textarea, {
				id: "encodedInput",
				class: "flex-grow-1",
				placeholder: "Encoded text here",
				value: this.encoded,
				onfocus: () => {
					this.mode = "decode"
				},
				onChange: (value: string): void => {
					if (this.mode === "decode") {
						this.encoded = value
						// TODO: The encoded content can be a data: URI. Handle that case.
						this.decoded = window.atob(this.encoded)
					}
				},
			}),
			m("label.fs-3", {
				for: "decodedInput",
				class: "form-label",
			}, decodedType + ":"),
			decodedView,
		]

	}

	openFile(file: File): void {
		const reader = new FileReader()
		reader.onloadend = () => {
			if (typeof reader.result === "string") {
				this.encodedDataUri = reader.result
				this.encoded = this.encodedDataUri.replace(/^[^,]+,/, "")
				m.redraw()
			} else {
				// <https://developer.mozilla.org/en-US/docs/Web/API/FileReader/result#value>.
				console.error("File reading didn't result in a string. This is unexpected.")
			}
		}
		reader.readAsDataURL(file)
	}

}
