import m from "mithril"
import {EditorView, keymap} from "@codemirror/view"
import {defaultKeymap} from "@codemirror/commands"
import {basicSetup} from "codemirror"
import {buildParser} from "@lezer/generator"
import type {LRParser} from "@lezer/lr"
import type {SyntaxNodeRef} from "@lezer/common"
import {ToolView} from "../components"
import {codeMirrorFullFlexSizing} from "../utils"

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

	private grammarEditor: null | EditorView = null
	private inputEditor: null | EditorView = null
	private treeEditor: null | EditorView = null
	private parser: null | LRParser = null
	private parserGenerationError: null | string = null

	oncreate(vnode: m.VnodeDOM): void {
		const grammarSpot = vnode.dom.querySelector(".editor-spot-grammar")
		if (grammarSpot != null) {
			this.grammarEditor = new EditorView({
				doc: initialContent,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					EditorView.updateListener.of(update => {
						if (update.docChanged) {
							setTimeout(() => this.recreateParser(), 0)
						}
					}),
					codeMirrorFullFlexSizing,
				],
			})
			grammarSpot.replaceWith(this.grammarEditor.dom)
			this.grammarEditor.dom.classList.add("flex-1")
		}
		const inputSpot = vnode.dom.querySelector(".editor-spot-input")
		if (inputSpot != null) {
			this.inputEditor = new EditorView({
				doc: "1 + (2 / 3) + 4\n",
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					EditorView.updateListener.of(update => {
						if (update.docChanged) {
							this.reparseInput()
						}
					}),
					codeMirrorFullFlexSizing,
				],
			})
			inputSpot.replaceWith(this.inputEditor.dom)
		}
		const treeSpot = vnode.dom.querySelector(".editor-spot-tree")
		if (treeSpot != null) {
			this.treeEditor = new EditorView({
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					EditorView.editable.of(false),
					codeMirrorFullFlexSizing,
				],
			})
			treeSpot.replaceWith(this.treeEditor.dom)
		}
		this.recreateParser()
		m.redraw()
	}

	mainView() {
		return [
			m("p.lead.mb-0", "This is a playground for the Lezer parser generator."),
			this.parserGenerationError != null
				? m(".hstack.gap-2.text-danger", [
					this.parserGenerationError,
					m("a", {
						href: `https://www.google.com/search?q=${encodeURIComponent(this.parserGenerationError)}`,
						target: "_blank",
						rel: "noopener",
					}, "Search Google"),
				])
				: m(".text-success", "Parser okay."),
			m(".h-100.hstack.align-items-stretch.gap-2.min-h-0", [
				m(".vstack.w-50", [
					m("h4", "Grammar:"),
					m(".editor-spot-grammar"),
				]),
				m(".vstack.w-50", [
					m("h4", "Sample Input:"),
					m(".editor-spot-input"),
					m("h4", "Syntax Tree:"),
					m(".editor-spot-tree"),
				]),
			]),
		]
	}

	private recreateParser(): void {
		if (this.grammarEditor != null) {
			// Ref: <https://lezer.codemirror.net/docs/ref/#generator.buildParser>.
			try {
				this.parser = buildParser(this.grammarEditor.state.doc.toString())
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
		if (this.parser != null && this.inputEditor != null) {
			const input = this.inputEditor.state.doc.toString()
			const tree = this.parser.parse(input)

			const buf: string[] = []
			let indent = 0

			tree.cursor().iterate(
				(node: SyntaxNodeRef): void | boolean => {
					const snippet = input.slice(node.from, node.to).replaceAll("\n", "\\n").replaceAll("\t", "\\t")
					buf.push("\t".repeat(indent) + node.name + ` (${snippet})`)
					++indent
				},
				(): void => {
					--indent
				},
			)

			this.treeEditor?.dispatch({
				changes: {
					from: 0,
					to: this.treeEditor?.state.doc.length,
					insert: buf.join("\n") + "\n",
				},
			})
		}
	}

}
