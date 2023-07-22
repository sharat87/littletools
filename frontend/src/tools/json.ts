import m from "mithril"
import Stream from "mithril/stream"
import { Button, CodeMirror, ToolView } from "~/src/components"
import { parser } from "~/src/parsers/json-permissive"
import type { EditorView } from "@codemirror/view"
import type { SyntaxNodeRef, TreeCursor } from "@lezer/common"
import { styleTags, tags as t } from "@lezer/highlight"
import { LanguageSupport, LRLanguage } from "@codemirror/language"
import { cmdEnterKeymap } from "~src/components/CodeMirror"

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

export default class extends ToolView {
	static title = "JSON Formatter"

	editor: Stream<null | EditorView> = Stream(null)

	constructor() {
		super()
		this.format = this.format.bind(this)
	}

	mainView(): m.Children {
		return [
			m("form.hstack.gap-2.flex-wrap", [
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
					", and then some, without using ",
					m("code", "eval"),
					".",
				]),
			]),
			m(CodeMirror, {
				hook: this.editor,
				doc: `{ key_without_quotes: 1.234, b: ["l", "m", "n", "trailing_commas",], c: { x: 1.2, date: ISODate("2022-08-18T03:55:31Z") } }`,
				fitSize: true,
				extensions: [
					cmdEnterKeymap(() => {
						this.format()
						return true
					}),
					new LanguageSupport(customJSONLang),
				]
			}),
		]
	}

	format(event: MouseEvent | null = null): void {
		const editor = this.editor()
		if (editor != null) {
			const indentation: Indentation = {
				"Tabs": "\t",
				"2 Spaces": "  ",
				"4 Spaces": "    ",
			}[(event?.target as HTMLButtonElement)?.innerText ?? "Tabs"] as Indentation
			editor.dispatch({
				changes: {
					from: 0,
					to: editor.state.doc.length,
					insert: reformatJSON(editor.state.doc.toString(), indentation) + "\n",
				},
			})
			editor.focus()
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
