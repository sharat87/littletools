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
	editor: null | EditorView = null

	constructor() {
		this.format = this.format.bind(this)
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			const input = `{ key_without_quotes: 1.234, b: ["l", "m", "n", "trailing_commas",], c: { x: 1.2, date: ISODate("2022-08-18T03:55:31Z") } }`
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
			m("h1", "JSON Formatter"),
			m("form.hstack.gap-2", [
				m("label", "Format with"),
				m(".btn-group.btn-group-sm", [
					m(Button, { appearance: "primary", onclick: this.format }, "Tabs"),
					m(Button, { appearance: "primary", onclick: this.format }, "2 Spaces"),
					m(Button, { appearance: "primary", onclick: this.format }, "4 Spaces"),
				]),
				m("div", [
					"Supports ",
					m("a", { href: "https://www.json.org/json-en.html" }, "JSON"),
					", ",
					m("a", { href: "https://json5.org/" }, "JSON5"),
					", ",
					m("a", { href: "https://www.mongodb.com/docs/manual/core/document/" }, "MongoDB Documents"),
					", and then some.",
				]),
			]),
			m(".editor-spot"),
		])
	}

	format(event: MouseEvent) {
		if (this.editor != null) {
			const indentation: Indentation = {
				"Tabs": "\t",
				"2 Spaces": "  ",
				"4 Spaces": "    ",
			}[(event.target as HTMLButtonElement).innerText] as Indentation
			this.editor.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: reformatJSON(this.editor.state.doc.toString(), indentation) + "\n",
				},
			})
			this.editor.focus()
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
