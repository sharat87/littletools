import m from "mithril"
import Stream from "mithril/stream"
import { EditorView, ViewUpdate } from "@codemirror/view"
import { buildParser } from "@lezer/generator"
import type { LRParser } from "@lezer/lr"
import type { SyntaxNodeRef } from "@lezer/common"
import { CodeMirror, ToolView } from "../components"

const initialContent = `@top Program { expression }

expression { Name | Number | BinaryExpression }

BinaryExpression { "(" expression ("+" | "-") expression ")" }

@tokens {
  Name { @asciiLetter+ }
  Number { @digit+ }
}
`

export default class extends ToolView {
	static title = "Lezer Playground"

	private grammarEditor: Stream<null | EditorView> = Stream(null)
	private inputEditor: Stream<null | EditorView> = Stream(null)
	private treeEditor: Stream<null | EditorView> = Stream(null)
	private parser: null | LRParser = null
	private parserGenerationError: null | string = null

	oncreate(vnode: m.VnodeDOM): void {
		this.recreateParser = this.recreateParser.bind(this)
		setTimeout(this.recreateParser, 0)
		this.grammarEditor.map(this.recreateParser)
		m.redraw()
	}

	mainView() {
		return [
			m("p.lead.mb-0", "This is a playground for the Lezer parser generator."),
			this.parserGenerationError != null
				? m(".hstack.gap-2.text-danger", [
					this.parserGenerationError,
					m("a", {
						href: `https://www.google.com/search?q=${ encodeURIComponent(this.parserGenerationError) }`,
						target: "_blank",
						rel: "noopener",
					}, "Search Google"),
				])
				: m(".text-success", "Parser okay."),
			m(".h-100.hstack.align-items-stretch.gap-2.min-h-0", [
				m(".vstack.w-50", [
					m("h4", "Grammar:"),
					m(CodeMirror, {
						hook: this.grammarEditor,
						doc: initialContent,
						onDocChanged: (_: ViewUpdate) => {
							setTimeout(this.recreateParser, 0)
						},
						fitSize: true,
					}),
				]),
				m(".vstack.w-50", [
					m("h4", "Sample Input:"),
					m(CodeMirror, {
						hook: this.inputEditor,
						onDocChanged: (_: ViewUpdate) => this.reparseInput(),
						fitSize: true,
					}),
					m("h4", "Syntax Tree:"),
					m(CodeMirror, {
						hook: this.treeEditor,
						fitSize: true,
						extensions: [
							EditorView.editable.of(false),
						],
					}),
				]),
			]),
		]
	}

	private recreateParser(): void {
		const grammarEditor = this.grammarEditor()
		if (grammarEditor != null) {
			// Ref: <https://lezer.codemirror.net/docs/ref/#generator.buildParser>.
			try {
				this.parser = buildParser(grammarEditor.state.doc.toString())
				if (this.parserGenerationError != null) {
					this.parserGenerationError = null
					m.redraw()
				}
			} catch (error) {
				this.parserGenerationError = error.message
				this.parser = null
				m.redraw()
			}
			this.reparseInput()
		}
	}

	private reparseInput(): void {
		const input = this.inputEditor()?.state.doc.toString()
		if (this.parser != null && input != null) {
			const tree = this.parser.parse(input)

			const buf: string[] = []
			let indent = 0

			tree.cursor().iterate(
				(node: SyntaxNodeRef): void | boolean => {
					const snippet = input.slice(node.from, node.to).replaceAll("\n", "\\n").replaceAll("\t", "\\t")
					buf.push("\t".repeat(indent) + node.name + ` (${ snippet })`)
					++indent
				},
				(): void => {
					--indent
				},
			)

			this.treeEditor()?.dispatch({
				changes: {
					from: 0,
					to: this.treeEditor()?.state.doc.length,
					insert: buf.join("\n") + "\n",
				},
			})
		}
	}

}
