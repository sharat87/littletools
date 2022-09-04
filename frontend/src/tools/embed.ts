import m from "mithril"
import { Button, ToolView } from "../components"
import * as Toaster from "../toaster"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { LanguageSupport } from "@codemirror/language"
import { customJSONLang } from "./json"

export default class extends ToolView {
	static title = "Embed Playground"

	hasLocalStorage: null | boolean = null
	hasCookies: null | boolean = null
	editor: null | EditorView = null

	constructor() {
		super()

		try {
			window.localStorage.length
			this.hasLocalStorage = true
		} catch (e) {
			this.hasLocalStorage = false
		}

		try {
			document.cookie
			this.hasCookies = true
		} catch (e) {
			this.hasCookies = false
		}
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				doc: `document.body.style.border = '5px solid #f09'\nsetTimeout("document.body.style = ''", 999)\n`,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					new LanguageSupport(customJSONLang),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.editor.dom.style.maxHeight = "200px"
			this.editor.focus()
		}
	}

	mainView(): m.Children {
		return [
			m("div", "This is a WIP. Load this tool in an iframe to make the best of it."),
			m("div", ["Is in a frame?: ", m("span", {
				class: window.top !== window.self ? "text-success" : "text-danger",
			}, window.top !== window.self ? "yes" : "no")]),
			this.hasLocalStorage != null && m("div", ["Local storage: ", m("span", {
				class: this.hasLocalStorage ? "text-success" : "text-danger",
			}, this.hasLocalStorage ? "available" : "not available")]),
			this.hasLocalStorage != null && m("div", ["Cookies: ", m("span", {
				class: this.hasLocalStorage ? "text-success" : "text-danger",
			}, this.hasLocalStorage ? "available" : "not available")]),
			m(".editor-spot"),
			m(".btn-toolbar", m(".btn-group", [
				m(Button, {
					appearance: "primary",
					onclick: () => {
						const editor = this.editor
						if (editor == null) {
							return
						}
						try {
							window.parent.window.eval(editor.state.doc.toString())
						} catch (e) {
							console.error(e)
							Toaster.push({
								title: "Eval in parent frame",
								body: m("p", String(e)),
								appearance: "danger",
							})
						}
					},
				}, "Eval in parent frame"),
				m(Button, {
					appearance: "outline-primary",
					onclick: () => {
						const editor = this.editor
						if (editor == null) {
							return
						}
						try {
							window.top!.window.eval(editor.state.doc.toString())
						} catch (e) {
							console.error(e)
							Toaster.push({
								title: "Eval in parent frame",
								body: m("p", String(e)),
								appearance: "danger",
							})
						}
					},
				}, "Eval in top frame"),
			])),
		]
	}
}
