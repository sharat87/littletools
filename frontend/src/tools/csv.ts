import m from "mithril"
import Stream from "mithril/stream"
import { CodeBlock, Notebook } from "~/src/components"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"

export function parseCsv(csv: string): string[][] {
	if (csv.match(/\S/) == null) {
		return []
	}

	const lines: string[] = csv.trim().split("\n")
	const rows: string[][] = []

	for (const line of lines) {
		const items = line.split(",")
		rows.push(items)
	}

	return rows
}

export function CSVToHTML(rows: string[][]): string {
	const html: string[] = ["<table>"]

	for (const row of rows) {
		html.push("\n  <tr>")
		for (const val of row) {
			html.push("\n    <td>", val, "</td>")
		}
		html.push("\n  </tr>")
	}

	html.push("\n</table>")
	return html.join("")
}

function CSVToSQL(rows: string[][]): string {
	const out: string[] = []
	const [header, ...body] = rows
	const prefix = "INSERT INTO table (" + header.join(", ") + ") VALUES ("

	for (const row of body) {
		out.push(prefix)
		for (const val of row) {
			let renderedValue = val
			if (!val.match(/^\d+$/) && val != "true" && val != "false") {
				renderedValue = "'" + val + "'"
			}
			out.push(renderedValue, ", ")
		}
		out.splice(-1, 1, ");\n")
	}

	return out.join("")
}

export default class {
	static title = "CSV Converter"

	private editor: null | EditorView = null
	private currentOutputTab: Stream<string>

	constructor() {
		this.currentOutputTab = Stream("HTML")
	}

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				doc: `one,two,three\nval1,val2,val3\n`,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					EditorView.updateListener.of(update => {
						if (update.docChanged) {
							m.redraw()
						}
					}),
				],
			})
			spot.replaceWith(this.editor.dom)
			m.redraw()
		}
	}

	view() {
		return m(".container.h-100.vstack.gap-2.pb-2", [
			m("h1", "CSV Converter"),
			m(".editor-spot"),
			this.editor != null && m(Notebook, {
				tabs: {
					SQL: () => m(CodeBlock, CSVToSQL(parseCsv(this.editor!.state.doc.toString()))),
					JSON: () => m("pre", "Coming soon"),
					YAML: () => m("pre", "Coming soon"),
					TOML: () => m("pre", "Coming soon"),
					Markdown: () => m("pre", "Coming soon"),
					HTML: () => m(CodeBlock, CSVToHTML(parseCsv(this.editor!.state.doc.toString()))),
				},
			}),
		])
	}

}
