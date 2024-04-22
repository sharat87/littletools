import m from "mithril"
import { EditorView, ViewUpdate } from "@codemirror/view"
import { LanguageSupport } from "@codemirror/language"
import { customJSONLang } from "./json"
import { CodeMirror, ToolView } from "../components"

const PREFIX: string = `<!doctype html>
<style>
html, body {
	background: none transparent;
}
</style>
`

const initialSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="128" height="128" fill="none"
\t\tstroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
\t<path d="M 20 40 Q 40 24 20 14 v 10 m 0 -10 h 10"/>
</svg>
`

export default class extends ToolView {
	static title = "SVG Preview"

	private editor: null | EditorView = null
	private content: string = initialSVG

	mainView(): m.Children {
		return [
			m("div", "This is a WIP. Content is not saved. Put some SVG in the editor and see it below live. Useful to edit/author small SVG icons."),
			m(CodeMirror, {
				doc: this.content,
				onDocChanged: (updape: ViewUpdate) => {
					this.content = updape.state.doc.toString()
					m.redraw()
				},
				fitSize: true,
				extensions: [
					new LanguageSupport(customJSONLang),
				],
			}),
			m("iframe.flex-1.rounded", {
				allowTransparency: "true",
				srcdoc: PREFIX + this.content,
			}),
		]
	}
}
