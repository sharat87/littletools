import m from "mithril"
import { CodeBlock, Notebook, ToolView } from "~/src/components"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap, indentLess, insertTab } from "@codemirror/commands"
import { basicSetup } from "codemirror"
import { padRight } from "../utils"

export function parseCsv(csv: string): string[][] {
	if (csv.match(/\S/) == null) {
		return []
	}

	const lines: string[] = csv.trim().split("\n")
	const rows: string[][] = []

	let separator = ","
	if (lines[0].includes("\t")) {
		separator = "\t"
	} else if (lines[0].includes(";")) {
		separator = ";"
	}

	for (const line of lines) {
		const items = line.split(separator)
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

	const columnMaxLengths: number[] = []
	for (const row of body) {
		for (let i = 0; i < row.length; i++) {
			const val = row[i]
			const len = val.length + 2
			if (columnMaxLengths[i] == null || len > columnMaxLengths[i]) {
				columnMaxLengths[i] = len
			}
		}
	}

	const headerLinePrefix = "-- COLUMNS:"
	out.push(headerLinePrefix, " ".repeat(prefix.length - headerLinePrefix.length),
		header.map((v, i) => padRight(v, " ", columnMaxLengths[i])).join(", "),
		"\n",
	)

	for (const row of body) {
		out.push(prefix)
		for (let i = 0; i < row.length; i++) {
			const val = row[i]
			let renderedValue = val
			if (!val.match(/^\d+$/) && val != "true" && val != "false") {
				renderedValue = "'" + val.replaceAll(/'/g, "''") + "'"
			}
			out.push(padRight(renderedValue, " ", columnMaxLengths[i]), ", ")
		}
		out.splice(-1, 1, ");\n")
	}

	return out.join("")
}

export default class extends ToolView {
	static title = "CSV Converter"

	private editor: null | EditorView = null

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				doc: `one,two,three\nval1,val2,val3\nanother val1,super val2,some other val3`,
				extensions: [
					keymap.of(defaultKeymap),
					keymap.of([{ key: "Tab", run: insertTab, shift: indentLess }]),
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

	mainView(): m.Children {
		return [
			m(".editor-spot"),
			this.editor != null && m(Notebook, {
				class: "flex-1 min-h-0",
				tabs: {
					SQL: () => m(CodeBlock, CSVToSQL(parseCsv(this.editor!.state.doc.toString()))),
					JSON: () => m("pre", "Coming soon"),
					YAML: () => m("pre", "Coming soon"),
					TOML: () => m("pre", "Coming soon"),
					Markdown: () => m("pre", "Coming soon"),
					HTML: () => m(CodeBlock, CSVToHTML(parseCsv(this.editor!.state.doc.toString()))),
				},
			}),
		]
	}

}
