import m from "mithril"
import { Checkbox, CodeBlock, Notebook, Textarea, ToolView } from "../components"
import Stream from "mithril/stream"

export default class extends ToolView {
	static title = "URL Encode/Decode"

	private encoded = ""
	private decoded = ""
	private decodeError: null | string = null
	private readonly enableDataHtmlUri = Stream(false)

	constructor() {
		super()
		this.encodeView = this.encodeView.bind(this)
		this.decodeView = this.decodeView.bind(this)
	}

	mainView(): m.Children {
		return [
			m("h1", "URL Encode / Decode"),
			m(Notebook, {
				class: "flex-grow-1",
				tabs: {
					"Encode from plain text": this.encodeView,
					"Decode to plain text": this.decodeView,
				},
			}),
		]
	}

	encodeView() {
		return [
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
			m(".hstack", [
				m(".fs-3.me-5", "Encoded:"),
				m(Checkbox, {
					id: "dataHtmlUri",
					model: this.enableDataHtmlUri,
				}, "Data HTML URI (WIP)"),
			]),
			m(CodeBlock, {
				class: "flex-grow-1",
			}, (this.enableDataHtmlUri() ? "data:text/html;charset=utf-8," : "") + this.encoded),
		]
	}

	decodeView() {
		return [
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
			m(".fs-3", {
				class: "form-label",
			}, "Plain Text:"),
			m(CodeBlock, {
				class: "flex-grow-1",
			}, this.decoded),
		]
	}
}
