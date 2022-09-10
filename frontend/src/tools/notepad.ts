import m from "mithril"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { Button, CopyButton, Icon, ToolView } from "../components"
import { downloadText } from "../utils"

// TODO: Drop a file to a special drop-zone space, to open it in the editor.
// TODO: Download edited file.
// TODO: Use filesystem API to save edited file directly?

export default class extends ToolView {
	static title = "Notepad"

	private editor: null | EditorView = null
	private wordCount: number = 0

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

	headerEndView(): m.Children {
		return m(".btn-group", [
			m(CopyButton, {
				appearance: "outline-secondary",
				size: "sm",
				content: () => this.editor?.state.doc.toString(),
			}, "Copy All"),
			m(Button, {
				appearance: "outline-secondary",
				size: "sm",
				onclick: (event: MouseEvent) => {
					event.preventDefault()
					if (this.editor != null) {
						downloadText(this.editor.state.doc.toString() ?? "")
					}
				},
			}, [m(Icon, "download"), "Download"]),
		])
	}

	mainView(): m.Children {
		return [
			m("div", [
				m("span.text-danger", "Text is not saved."),
				" There's find/replace, multiple cursors with Opt+click, and so on. Drop a file in the editor to load its contents at the cursor. There's ",
				m("span.text-primary", this.wordCount),
				` word${ this.wordCount !== 1 ? "s" : "" }.`,
			]),
			m(".editor-spot"),
		]
	}

	computeWordCount() {
		const text = this.editor?.state.doc.toString()
		if (text != null) {
			this.wordCount = text.trim().split(/\s+/).filter(w => w.match(/\w/)).length
		}
	}

}
