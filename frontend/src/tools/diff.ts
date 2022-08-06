import m from "mithril"
import Stream from "mithril/stream"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"

interface State {
	left: Stream<string>
	right: Stream<string>
	diff: string
}

export default class implements m.ClassComponent {
	static title = "Diff"

	editor1: null | EditorView
	editor2: null | EditorView

	constructor() {
		this.editor1 = this.editor2 = null
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot1 = vnode.dom.querySelector(".editor-spot-1")
		if (spot1 != null) {
			this.editor1 = new EditorView({
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
				],
			})
			spot1.replaceWith(this.editor1.dom)
			this.editor1.focus()
		}
		const spot2 = vnode.dom.querySelector(".editor-spot-2")
		if (spot2 != null) {
			this.editor2 = new EditorView({
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
				],
			})
			spot2.replaceWith(this.editor2.dom)
			this.editor2.focus()
		}
	}

	view(): m.Children {
		return m(".container", [
			m("h1", "Diff"),
			m("p", "This is a WIP."),
			m(".hstack", [
				m(".editor-spot-1"),
				m(".editor-spot-2"),
			]),
		])
	}
}
