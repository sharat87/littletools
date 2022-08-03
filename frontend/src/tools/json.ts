import m from "mithril"
import { Button } from "~/src/components"
import { parser } from "~/src/parsers/json-permissive"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import type { SyntaxNodeRef, TreeCursor } from "@lezer/common"
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
			//const input = JSON.stringify({ a: 1, b: ["l", "m", "n"], c: { x: 1.2, y: 5.6 } })
			const input = JSON.stringify({ c: { x: 1 } })
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
			console.log("Rendered", reformatJSON(this.editor.state.doc.toString()))

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

export function reformatJSON(json: string): string {
	return generateString(json, parser.parse(json).cursor()).join("")
}

function generateString(content: string, cursor: TreeCursor, indent = 0): string[] {
	const buf: string[] = []

	cursor.iterate(
		(node: SyntaxNodeRef): void | boolean => {
			console.log("enter", node.type)
			if (node.name === "Object") {
				if (!node.matchContext(["ObjectValue"]) && !node.matchContext(["LastObjectValue"])) {
					buf.push(`${ " ".repeat(indent) }`)
				}
				buf.push("{")
				indent += 2
			} else if (node.name === "ObjectKey") {
				buf.push(`\n${ " ".repeat(indent) }${ content.substring(node.from, node.to) }: `)
				return false
			} else if (node.name === "Array") {
				if (!node.matchContext(["ObjectValue"]) && !node.matchContext(["LastObjectValue"]) && !node.matchContext(["ArrayValue"]) && !node.matchContext(["LastArrayValue"])) {
					buf.push(`${ " ".repeat(indent) }`)
				}
				buf.push("[")
				indent += 2
			} else if (node.name === "ArrayValue" || node.name === "LastArrayValue") {
				buf.push(`\n${ " ".repeat(indent) }`)
			} else if (node.name === "String" || node.name === "Number" || node.name === "Boolean") {
				buf.push(`${ content.substring(node.from, node.to) }`)
				return false
			}
		},
		(node: SyntaxNodeRef): void => {
			console.log("leave", node.type)
			if (node.name === "Object") {
				indent -= 2
				buf.push(`\n${ " ".repeat(indent) }}`)
			} else if (node.name === "Array") {
				indent -= 2
				buf.push(`\n${ " ".repeat(indent) }]`)
			} else if (node.name === "ObjectValue" || node.name === "ArrayValue") {
				buf.push(",")
			}
		},
	)

	return buf
}
