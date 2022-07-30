import m from "mithril"

export default class {
	encoded: string
	decoded: string
	decodeError: null | string

	static title = "URL Encode/Decode"

	constructor() {
		this.encoded = this.decoded = ""
		this.decodeError = null
	}

	view() {
		return m(".container", [
			m("h1", "URL Encode / Decode"),
			m("h2", "Encoded"),
			m("textarea", {
				value: this.encoded,
				oninput: (event) => {
					try {
						this.decoded = decodeURIComponent(this.encoded = event.target.value)
						this.decodeError = null
					} catch (error) {
						this.decodeError = error.toString()
					}
				},
			}),
			this.decodeError != null && m("p.alert.alert-danger", [m("b", "Error decoding: "), this.decodeError]),
			m("h2", "Decoded"),
			m("textarea", {
				value: this.decoded,
				oninput: (event) => {
					this.encoded = encodeURIComponent(this.decoded = event.target.value)
					this.decodeError = null
				},
			}),
		])
	}
}
