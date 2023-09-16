import m from "mithril"
import { CodeBlock, CodeMirror, ToolView } from "~src/components"
import { EditorView } from "@codemirror/view"
import { LanguageSupport } from "@codemirror/language"
import { customJSONLang } from "./json"
import { Layout } from "../components/ToolView"
import { cmdEnterKeymap } from "../components/CodeMirror"

const AsyncFunction = Object.getPrototypeOf(async () => {
}).constructor

export default class extends ToolView {
	static title = "Javascript Playground"
	static layout = Layout.Page

	result: string = ""
	error: null | Error = null
	state: "ready" | "running" | "done" | "error" = "ready"

	mainView(): m.Children {
		return [
			m("p.my-2", [
				"Write any Javascript, and hit ",
				m("kbd", "Ctrl+Enter"),
				" to run it in an async function, and show the ",
				m("code", "return"),
				"ed value below. ",
				m("strong", "Nothing is saved."),
			]),
			m(
				"p.alert.py-2",
				{
					class: "alert-" + {
						ready: "primary",
						running: "warning",
						done: "success",
						error: "danger",
					}[this.state],
				},
				[
					m("strong", this.state.replace("done", "ready").replace(/^./, c => c.toUpperCase())),
					this.error ? [m.trust(" &mdash; "), this.error.message] : null,
				],
			),
			m(CodeMirror, {
				doc: `const response = await fetch("https://httpbun.com/get")\nreturn response.json()\n`,
				extensions: [
					cmdEnterKeymap((target: EditorView) => {
						this.evalCode(target)
						return true
					}),
					new LanguageSupport(customJSONLang),
				]
			}),
			this.result && m(CodeBlock, { class: "my-2" }, this.result),
		]
	}

	evalCode(editor: EditorView): void {
		this.state = "running"
		m.redraw()
		let fn: AsyncFunction
		try {
			fn = new AsyncFunction(editor.state.doc.toString())
		} catch (err) {
			this.state = "error"
			this.result = ""
			this.error = err
			m.redraw()
			return
		}

		fn()
			.then((result: unknown) => {
				this.state = "done"
				this.error = null
				if (typeof result === "object") {
					this.result = JSON.stringify(result, null, 2)
				} else if (result == null) {
					this.result = "null"
				} else {
					this.result = result.toString()
				}
				m.redraw()
			})
			.catch((err: Error) => {
				this.state = "error"
				this.result = ""
				this.error = err
				console.log(err)
				m.redraw()
			})
			.finally(() => {
				m.redraw()
			})
	}
}
