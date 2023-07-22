import m from "mithril"
import Stream from "mithril/stream"
import { EditorView } from "@codemirror/view"
import { Button, CodeMirror, CopyButton, Icon, ToolView } from "../components"
import { downloadText } from "../utils"

// TODO: Drop a file to a special drop-zone space, to open it in the editor.
// TODO: Download edited file.
// TODO: Use filesystem API to save edited file directly?

export default class extends ToolView {
	static title = "Notepad"

	private editor: Stream<null | EditorView> = Stream(null)
	private wordCount: number = 0

	headerEndView(): m.Children {
		return m(".btn-group", [
			m(CopyButton, {
				appearance: "outline-secondary",
				size: "sm",
				content: () => this.editor()?.state.doc.toString(),
			}, "Copy All"),
			m(Button, {
				appearance: "outline-secondary",
				size: "sm",
				onclick: (event: MouseEvent) => {
					event.preventDefault()
					const editor = this.editor()
					if (editor != null) {
						downloadText(editor.state.doc.toString() ?? "")
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
			m(CodeMirror, {
				hook: this.editor,
				onDocChanged: () => {
					this.computeWordCount()
				},
				fitSize: true,
			}),
		]
	}

	computeWordCount() {
		const text = this.editor()?.state.doc.toString()
		if (text != null) {
			this.wordCount = text.trim().split(/\s+/).filter(w => w.match(/\w/)).length
			m.redraw()
		}
	}

}
