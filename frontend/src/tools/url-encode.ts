import m from "mithril"
import { Checkbox, Textarea } from "../components"
import Stream from "mithril/stream"

export default class {
	static title = "URL Encode/Decode"

	private encoded = ""
	private decoded = ""
	private decodeError: null | string = null
	private readonly enableDataHtmlUri = Stream(false)

	view() {
		return m(".container.d-flex.flex-column.h-100.pb-3", [
			m("h1", "URL Encode / Decode"),
			m(".hstack", [
				m("label.fs-3.me-5", {
					for: "encodedInput",
					class: "form-label",
				}, "Encoded:"),
				m(Checkbox, {
					id: "dataHtmlUri",
					model: this.enableDataHtmlUri,
				}, "Data HTML URI (WIP)"),
			]),
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
