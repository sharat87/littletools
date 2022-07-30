import m from "mithril"
import Stream from "mithril/stream"
import { Notebook, Textarea } from "../components"

export function parseCsv(csv: string): string[][] {
	if (csv.match(/\S/) == null) {
		return []
	}

	const lines: string[] = csv.split("\n")
	const rows: string[][] = []

	for (const line of lines) {
		const items = line.split(",")
		rows.push(items)
	}

	return rows
}

export function csvToHtmlTable(rows: string[][]): string {
	const html: string[] = ["<table>"]

	for (const row of rows) {
		html.push("<tr>")
		for (const val of row) {
			html.push("<td>", val, "</td>")
		}
		html.push("</tr>")
	}

	html.push("</table>")
	return html.join("")
}

export default class {
	private readonly input: Stream<string>
	private readonly parsed: Stream<string[][]>
	private currentOutputTab: Stream<string>

	static title = "CSV Converter"

	constructor() {
		this.input = Stream("")
		this.parsed = this.input.map(parseCsv)
		this.currentOutputTab = Stream("HTML")
	}

	view() {
		return m(".container.h-100.d-flex.flex-column", [
			m("h1", "CSV Converter"),
			m(Textarea, {
				class: "flex-grow-1 mb-4",
				placeholder: "CSV Input text",
				model: this.input,
			}),
			this.input() !== "" && m(Notebook, {
				class: "flex-grow-1",
				tabs: {
					HTML: () => m("pre", csvToHtmlTable(this.parsed())),
					JSON: () => m("pre", "Coming soon"),
					YAML: () => m("pre", "Coming soon"),
					TOML: () => m("pre", "Coming soon"),
					Markdown: () => m("pre", "Coming soon"),
				},
			}),
		])
	}

}
