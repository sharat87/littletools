import m from "mithril"
import { Textarea } from "../components"

// TODO: Support rotating by a configuration count, not just 13. In such cases, encoding and decoding are diff ops.

export default {
	title: "Rot13 Encode/Decode",
	oninit,
	view,
}

interface State {
	mode: null | string
	encoded: string
	decoded: string
}

function oninit(vnode: m.Vnode<never, State>) {
	vnode.state.mode = null
	vnode.state.encoded = vnode.state.decoded = ""
}

function view(vnode: m.Vnode<never, State>): m.Children {
	let decodedType: string
	let decodedView: m.Children = null

	return m(".container.d-flex.flex-column.h-100.pb-3", { ondragover, ondragleave, ondrop }, [
		m("h1", "Encode and decode with Rot13"),
		m("label.fs-3", {
			for: "encodedInput",
			class: "form-label",
		}, "Encoded:"),
		m(Textarea, {
			id: "encodedInput",
			class: "flex-grow-1",
			placeholder: "Encoded text here",
			value: vnode.state.encoded,
			onfocus: () => {
				vnode.state.mode = "decode"
			},
			onChange: (value: string): void => {
				if (vnode.state.mode === "decode") {
					vnode.state.encoded = value
					vnode.state.decoded = rot13(vnode.state.encoded)
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
			value: vnode.state.decoded,
			onfocus: () => {
				vnode.state.mode = "encode"
			},
			onChange: (value: string): void => {
				if (vnode.state.mode === "encode") {
					vnode.state.decoded = value
					vnode.state.encoded = rot13(vnode.state.decoded)
				}
			},
		}),
	])
}

function rot13(input: string): string {
	return input.replace(/[a-zA-Z]/g, (match) => {
		const code = match[0].charCodeAt(0)
		const offset = (code > 96 ? "a" : "A").charCodeAt(0)
		return String.fromCharCode(((code - offset + 13) % 26) + offset)
	})
}
