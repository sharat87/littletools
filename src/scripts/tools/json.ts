import m from "mithril"
import { Button } from "../components"
import { parser } from "../parsers/json-permissive"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import type { TreeCursor } from "@lezer/common"
import { styleTags, tags as t } from "@lezer/highlight"
import { LanguageSupport, LRLanguage, syntaxTree } from "@codemirror/language"

export const customJSONLang = LRLanguage.define({
	parser: parser.configure({
		props: [
			styleTags({
				Number: t.number,
				String: t.string,
				Boolean: t.keyword,
			}),
		],
	}),
})

export function format(content: string): string {
	return JSON.stringify(JSON.parse(content), null, 4).trim()
}

export default class implements m.ClassComponent {
	content: string
	editor: null | EditorView

	static title = "JSON Formatter"

	constructor() {
		this.content = ""
		this.editor = null
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			const input = JSON.stringify({ a: 1, b: 2, c: 3 })
			this.editor = new EditorView({
				doc: input,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					new LanguageSupport(customJSONLang),
				],
			})
			spot.replaceWith(this.editor.dom)
		}
	}

	view() {
		return m(".container.h-100.pb-2.d-flex.flex-column", [
			m("h1", "JSON Formatter Tool"),
			m("p.btn-toolbar", m(".btn-group", [
				m(
					Button,
					{
						onclick: () => {
							this.format()
						},
					},
					"Format JSON",
				),
				m(
					Button,
					{
						onclick: () => {
							alert("Coming soon")
						},
					},
					"Sort keys in all objects",
				),
			])),
			m(".editor-spot"),
		])
	}

	format() {
		if (this.editor != null) {
			console.log(syntaxTree(this.editor.state))
			const tree = parser.parse(this.editor.state.doc.toString())

			// const cursor = tree.cursor()
			// do {
			// 	console.log(`Node ${ cursor.name } from ${ cursor.from } to ${ cursor.to }`)
			// } while (cursor.next())

			const c = tree.cursor()
			console.log("Rendered", generateString(this.editor.state.doc.toString(), c).join(""))

			// console.log(tree.topNode.firstChild.type)
			// console.log(tree.topNode.firstChild.firstChild.type)
			// console.log(tree.topNode.firstChild.lastChild.type)

			this.editor.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: format(this.editor.state.doc.toString()) + "\n",
				},
			})
		}
	}

}

function generateString(content: string, cursor: TreeCursor): string[] {
	const buf: string[] = []
	let indent = 0

	while (cursor.next()) {
		console.log("Node", cursor.name, "from", cursor.from, "to", cursor.to, buf)
		if (cursor.name === "Object") {
			buf.push("{\n")
			++indent
			cursor.firstChild()
			do {
				buf.push(content.substring(cursor.from, cursor.to))
				cursor.nextSibling()
				buf.push(content.substring(cursor.from, cursor.to))
			} while (cursor.nextSibling())
			buf.push("}")
			--indent

		} else if (cursor.name === "ObjectKey") {
			buf.push(content.substring(cursor.from, cursor.to), ": ")

		} else if (cursor.name === "String" || cursor.name === "Number" || cursor.name === "Boolean") {
			if (!cursor.matchContext(["ObjectKey"])) {
				buf.push(content.substring(cursor.from, cursor.to))
			}
			if (cursor.matchContext(["Object"])) {
				buf.push(",\n")
			}

		}
	}

	return buf
}
