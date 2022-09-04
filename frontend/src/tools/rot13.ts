import m from "mithril"
import { Textarea, ToolView } from "../components"

// TODO: Support rotating by a configuration count, not just 13. In such cases, encoding and decoding are diff ops.

export default class extends ToolView {
	static title = "Rot13 Encode/Decode"

	private mode: null | string = null
	private encoded: string = ""
	private decoded: string = ""

	mainView(): m.Children {
		return [
			m("label.fs-3", {
				for: "encodedInput",
				class: "form-label",
			}, "Encoded:"),
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
						this.decoded = rot13(this.encoded)
					}
				},
			}),
			m("label.fs-3", {
				for: "decodedInput",
				class: "form-label",
			}, "Plain Text:"),
			m(Textarea, {
				id: "decodedInput",
				class: "flex-grow-1",
				placeholder: "Decoded text here",
				value: this.decoded,
				onfocus: () => {
					this.mode = "encode"
				},
				onChange: (value: string): void => {
					if (this.mode === "encode") {
						this.decoded = value
						this.encoded = rot13(this.decoded)
					}
				},
			}),
		]
	}

}

function rot13(input: string): string {
	return input.replace(/[a-zA-Z]/g, (match) => {
		const code = match[0].charCodeAt(0)
		const offset = (code > 96 ? "a" : "A").charCodeAt(0)
		return String.fromCharCode(((code - offset + 13) % 26) + offset)
	})
}
