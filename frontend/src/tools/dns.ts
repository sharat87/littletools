import m from "mithril"
import Stream from "mithril/stream"
import { Button, Input, ToolView } from "~/src/components"
import { DNSAnswer, DNSRecordType, DNSRecordTypes, DNSResult, resolveDNS } from "../utils"

const DNS_RR_NAMES: Record<number, string> = {
	1: "A",
	28: "AAAA",
	5: "CNAME",
	16: "TXT",
	15: "MX",
}

export default class extends ToolView {
	static title = "DNS Lookup"

	private readonly host: Stream<string> = Stream("sharats.me")
	private readonly results = Stream<DNSResult[]>([])
	private readonly answers: Stream<DNSAnswer[]>
	private readonly comments: Stream<string[]>

	constructor() {
		super()
		this.answers = this.results.map((results: DNSResult[]) => {
			const answers: DNSAnswer[] = []
			for (const result of results) {
				if (result.Answer != null) {
					answers.push(...result.Answer)
				}
			}
			return answers
		})
		this.comments = this.results.map((results) => {
			const comments: string[] = []
			for (const result of results) {
				if (result.Comment != null && !result.Comment.startsWith("Response from ")) {
					comments.push(result.Comment)
				}
			}
			return comments
		})
	}

	mainView(): m.Children {
		return [
			m("form.hstack.gap-2.mb-4", {
				onsubmit: (event: SubmitEvent) => {
					event.preventDefault()
					this.resolve("All")
						.catch((error) => {
							console.error("Error getting all DNS records", error)
						})
				},
			}, [
				m(Input, {
					class: "w-auto",
					model: this.host,
					placeholder: "Domain",
				}),
				m(".btn-group", [
					DNSRecordTypes.map((type) => m(Button, {
						appearance: "outline-primary",
						onclick: () => this.resolve(type),
					}, type)),
					m(Button, { appearance: "primary", type: "submit" }, "All"),
				]),
			]),
			this.comments().length > 0 && m("ul.alert.alert-info.ps-5", this.comments().map((c) => m("li", c))),
			this.results().length > 0 && this.answers().length === 0 && m(".alert.alert-info", "No records found."),
			this.answers().length > 0 && m(".table-responsive", m("table.table.table-bordered.table-hover", [
				m("thead", m("tr", [
					m("th", { scope: "col" }, "Type"),
					m("th", { scope: "col" }, "Value"),
					m("th", { scope: "col" }, "TTL"),
				])),
				m("tbody", this.answers().map((item) => m("tr", [
					m("th", { scope: "row" }, DNS_RR_NAMES[item.type]),
					m("td", m("code", String(item.data))),
					m("td", [item.TTL, " seconds"]),
				]))),
			])),
		]
	}

	async resolve(type: DNSRecordType | "All") {
		this.results([])
		const host = this.host()
		m.redraw()

		if (type === "All") {
			this.results(await Promise.all(DNSRecordTypes.map((type) => resolveDNS(host, type))))
		} else {
			this.results([await resolveDNS(host, type)])
		}
	}

}
