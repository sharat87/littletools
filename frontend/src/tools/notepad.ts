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

	private editor: null | EditorView = null
	private wordCount: number = 0
	private isDragging: boolean = false

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					EditorView.updateListener.of(update => {
						if (update.docChanged && this.editor?.hasFocus) {
							this.computeWordCount()
							m.redraw()
						}
					}),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.editor.focus()
		}
	}

	view() {
		return m(".container.h-100.vstack.gap-2.pb-2", [
			m("h1", "Notepad"),
			m(".hstack.gap-2", [
				m(CopyButton, {
					appearance: "outline-secondary",
					size: "sm",
					content: () => this.editor?.state.doc.toString(),
				}, "Copy All"),
				m("div", [
					m("span.text-danger", "Text is not saved."),
					" There's find/replace, multiple cursors with Opt+click, and so on. Drop a file in the editor to load its contents at the cursor. There's ",
					m("span.text-primary", this.wordCount),
					` word${ this.wordCount !== 1 ? "s" : "" }.`,
				]),
			]),
			m(".editor-spot"),
		])
	}

	computeWordCount() {
		const text = this.editor?.state.doc.toString()
		if (text != null) {
			this.wordCount = text.trim().split(/\s+/).filter(w => w.match(/\w/)).length
		}
	}

}
