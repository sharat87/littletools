import m from "mithril"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { LanguageSupport } from "@codemirror/language"
import { customJSONLang } from "./json"
import { ToolView } from "../components"
import { codeMirrorFullFlexSizing } from "../utils"

const initialSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="128" height="128" fill="none"
\t\tstroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
\t<path d="M 20 40 Q 40 24 20 14 v 10 m 0 -10 h 10"/>
</svg>
`

export default class extends ToolView {
	static title = "SVG Preview"

	private editor: null | EditorView = null
	private content: string = initialSVG

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				doc: this.content,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					codeMirrorFullFlexSizing,
					new LanguageSupport(customJSONLang),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							this.content = update.state.doc.toString()
							m.redraw()
						}
					}),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.editor.focus()
			m.redraw()
		}
	}

	mainView(): m.Children {
		return [
			m("div", "This is a WIP. Content is not saved. Put some SVG in the editor and see it below live. Useful to edit/author small SVG icons."),
			m(".editor-spot"),
			this.editor != null && m(".flex-1.hstack.justify-content-around.svg-preview", m.trust(this.content)),
			m("style", ".svg-preview svg { border: 1px solid #ccc; }"),
		]
	}
}
