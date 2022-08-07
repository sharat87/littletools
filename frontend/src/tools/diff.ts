import m from "mithril"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"

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
			this.editor1.dom.classList.add("h-100")
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
			this.editor2.dom.classList.add("h-100")
			spot2.replaceWith(this.editor2.dom)
			this.editor2.focus()
		}
	}

	view(): m.Children {
		return m(".container.h-100.d-flex.flex-column.pb-2", [
			m("h1", "Diff"),
			m("p", "This is a WIP."),
			m(".hstack.flex-grow-1", [
				m(".editor-spot-1"),
				m(".editor-spot-2"),
			]),
		])
	}
}
