import m from "mithril"
import { CodeBlock, ToolView } from "../components"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { LanguageSupport } from "@codemirror/language"
import { customJSONLang } from "./json"
import { cmdEnterKeymap } from "../utils"

const AsyncFunction = Object.getPrototypeOf(async () => {
}).constructor

export default class extends ToolView {
	static title = "Javascript Playground"

	editor: null | EditorView = null
	result: string = ""
	error: null | Error = null

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				doc: `const response = await fetch("https://httpbun.com/get")\nreturn response.json()\n`,
				extensions: [
					keymap.of(defaultKeymap),
					cmdEnterKeymap((target: EditorView) => {
						this.evalCode(target)
						return true
					}),
					basicSetup,
					new LanguageSupport(customJSONLang),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.editor.focus()
		}
	}

	mainView(): m.Children {
		return [
			m("p", [
				"Write any Javascript, and hit ",
				m("kbd", "Ctrl+Enter"),
				" to run it in an async function, and show the ",
				m("code", "return"),
				"ed value below. ",
				m("strong", "Nothing is saved."),
			]),
			m(".editor-spot"),
			this.result && m(CodeBlock, this.result),
		]
	}

	evalCode(editor: EditorView): void {
		new AsyncFunction(editor.state.doc.toString())()
			.then((result: unknown) => {
				this.error = null
				if (typeof result === "object") {
					this.result = JSON.stringify(result, null, 2)
				} else if (result == null) {
					this.result = "null"
				} else {
					this.result = result.toString()
				}
			})
			.catch((err: Error) => {
				this.result = ""
				this.error = err
				console.log(err)
			})
			.finally(() => {
				m.redraw()
			})
	}
}
