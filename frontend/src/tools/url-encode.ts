import m from "mithril"
import { Textarea } from "../components"

export default class {
	static title = "URL Encode/Decode"
	encoded: string
	decoded: string
	decodeError: null | string

	constructor() {
		this.encoded = this.decoded = ""
		this.decodeError = null
	}

	view() {
		return m(".container.d-flex.flex-column.h-100.pb-3", [
			m("h1", "URL Encode / Decode"),
			m("label.fs-3", {
				for: "encodedInput",
				class: "form-label",
			}, "Encoded:"),
			m(Textarea, {
				id: "encodedInput",
				class: "flex-grow-1",
				value: this.encoded,
				onChange: (value: string): void => {
					try {
						this.decoded = decodeURIComponent(this.encoded = value)
						this.decodeError = null
					} catch (error) {
						this.decodeError = error.toString()
					}
				},
			}),
			this.decodeError != null && m("p.alert.alert-danger", [m("b", "Error decoding: "), this.decodeError]),
			m("label.fs-3", {
				for: "decodedInput",
				class: "form-label",
			}, "Plain Text:"),
			m(Textarea, {
				id: "decodedInput",
				class: "flex-grow-1",
				value: this.decoded,
				onChange: (value: string): void => {
					this.encoded = encodeURIComponent(this.decoded = value)
					this.decodeError = null
				},
			}),
		])
	}
}
