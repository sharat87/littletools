import m from "mithril"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { CopyButton } from "../components"

// TODO: Drop a file to open it in the editor.
// TODO: Download edited file.
// TODO: Use filesystem API to save edited file directly?

export default class implements m.ClassComponent {
	static title = "Notepad"
	editor: null | EditorView

	constructor() {
		this.editor = null
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
				],
			})
			spot.replaceWith(this.editor.dom)
			this.editor.focus()
		}
	}

	view() {
		return m(".container.h-100.vstack", [
			m("h1", "Notepad"),
			m(".hstack.gap-2", [
				m(CopyButton, {
					appearance: "outline-secondary",
					size: "sm",
					content: () => this.editor?.state.doc.toString(),
				}, "Copy All"),
				"Text is not saved.",
			]),
			m(".editor-spot"),
		])
	}

}
