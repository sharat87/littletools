import m from "mithril"
import { Button } from "~/src/components"
import { parser } from "~/src/parsers/json-permissive"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import type { SyntaxNodeRef, TreeCursor } from "@lezer/common"
import { styleTags, tags as t } from "@lezer/highlight"
import { LanguageSupport, LRLanguage } from "@codemirror/language"

export const customJSONLang = LRLanguage.define({
	parser: parser.configure({
		props: [
			styleTags({
				Number: t.number,
				String: t.string,
				Boolean: t.keyword,
				Identifier: t.tagName,
				New: t.keyword,
				LineComment: t.comment,
			}),
		],
	}),
})

type Indentation = "  " | "    " | "\t"

export default class implements m.ClassComponent {
	static title = "JSON Formatter"
	editor: null | EditorView
	indentation: Indentation

	constructor() {
		this.editor = null
		this.indentation = "  "
		this.format = this.format.bind(this)
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			const input = JSON.stringify({ a: 1, b: ["l", "m", "n"], c: { x: 1.2, y: 5.6 } })
			this.editor = new EditorView({
				doc: input,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					new LanguageSupport(customJSONLang),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.editor.focus()
		}
	}

	view() {
		return m(".container.h-100.pb-2.vstack.gap-2", [
			m("h1", "JSON Formatter Tool"),
			m("form.hstack.gap-2", [
				m("label.visually-hidden", { for: "indentation" }, "Indentation"),
				m(
					"select.form-select.w-auto",
					{
						id: "indentation",
						title: "Indentation",
						onchange: (e: Event) => {
							const choice = (e.target as HTMLSelectElement).value
							if (choice === "4 spaces") {
								this.indentation = "    "
							} else if (choice === "tab") {
								this.indentation = "\t"
							} else {
								this.indentation = "  "
							}
						},
					},
					[
						m("option", "2 spaces"),
						m("option", "4 spaces"),
						m("option", "tab"),
					],
				),
				m(Button, { appearance: "primary", onclick: this.format }, "Reformat"),
				"Supports JSON, JSON5, MongoDB result objects, and then some.",
			]),
			m(".editor-spot"),
		])
	}

	format() {
		if (this.editor != null) {
			this.editor.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: reformatJSON(this.editor.state.doc.toString(), this.indentation) + "\n",
				},
			})
		}
	}

}

export function reformatJSON(json: string, indentation: Indentation = "  "): string {
	return generateString(json, parser.parse(json).cursor(), indentation).join("")
}

function generateString(content: string, cursor: TreeCursor, indentation: Indentation): string[] {
	const buf: string[] = []
	let indentDepth = 0

	const isEmptyStack: boolean[] = []

	cursor.iterate(
		(node: SyntaxNodeRef): void | boolean => {
			if (node.name === "Object") {
				buf.push("{")
				isEmptyStack.push(true)
				indentDepth += 1
			} else if (node.name === "ObjectKey") {
				buf.push(`\n${ indentation.repeat(indentDepth) }${ content.substring(node.from, node.to) }: `)
				isEmptyStack[isEmptyStack.length - 1] = false
				return false
			} else if (node.name === "Array") {
				buf.push("[")
				isEmptyStack.push(true)
				indentDepth += 1
			} else if (node.name === "ArrayValue") {
				buf.push(`\n${ indentation.repeat(indentDepth) }`)
				isEmptyStack[isEmptyStack.length - 1] = false
			} else if (node.name === "Instantiation" || node.name === "FunctionCall") {
				buf.push(`${ content.substring(node.from, node.to) }`)
				return false
			} else if (node.name === "String" || node.name === "Number" || node.name === "Boolean" || node.name === "Identifier" || node.name === "Comma") {
				buf.push(`${ content.substring(node.from, node.to) }`)
				return false
			} else if (node.name === "LineComment") {
				buf.push(` ${ content.substring(node.from, node.to) }`)
				return false
			}
		},
		(node: SyntaxNodeRef): void => {
			if (node.name === "Object") {
				indentDepth -= 1
				if (!isEmptyStack.pop()) {
					buf.push(`\n${ indentation.repeat(indentDepth) }`)
				}
				buf.push(`}`)
			} else if (node.name === "Array") {
				indentDepth -= 1
				if (!isEmptyStack.pop()) {
					buf.push(`\n${ indentation.repeat(indentDepth) }`)
				}
				buf.push(`]`)
			}
		},
	)

	return buf
}
