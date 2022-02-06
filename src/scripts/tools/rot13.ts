import m from "mithril"

// TODO: Support rotating by a configuration count, not just 13. In such cases, encoding and decoding are diff ops.

export default {
	title: "Rot13 Encode/Decode",
	oncreate,
	view,
}

interface State {
	mode: null | string
	encoded: string
	decoded: string
}

function oncreate(vnode: m.Vnode<never, State>) {
	vnode.state.mode = null
	vnode.state.encoded = vnode.state.decoded = ""
}

function view(vnode: m.Vnode<never, State>): m.Children {
	let decodedType: string
	let decodedView: m.Children = null

	return m(".h100.pa1", { ondragover, ondragleave, ondrop }, [
		m("h1", "Encode and decode with Rot13"),
		m("h2", "Encoded:"),
		m("textarea", {
			placeholder: "Encoded text here",
			value: vnode.state.encoded,
			onfocus: () => {
				vnode.state.mode = "decode"
			},
			oninput: (event: InputEvent) => {
				if (vnode.state.mode === "decode") {
					vnode.state.encoded = (event.target as HTMLTextAreaElement).value
					vnode.state.decoded = rot13(vnode.state.encoded)
				}
			},
		}),
		m("h2", `Plain text:`),
		m("textarea", {
			placeholder: "Decoded text here",
			value: vnode.state.decoded,
			onfocus: () => {
				vnode.state.mode = "encode"
			},
			oninput: (event: InputEvent) => {
				if (vnode.state.mode === "encode") {
					vnode.state.decoded = (event.target as HTMLTextAreaElement).value
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
