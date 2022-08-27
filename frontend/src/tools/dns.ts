import m from "mithril"
import Stream from "mithril/stream"
import { Button, Input } from "~/src/components"

// Ref: <https://developers.google.com/speed/public-dns/docs/doh/json#dns_response_in_json>.
type DNSResult = {
	Status: number
	Answer?: {
		name: string
		type: number
		TTL: number
		data: string
	}[]
	Comment?: string
}

const DNS_RR_NAMES: Record<number, string> = {
	1: "A",
	28: "AAAA",
	5: "CNAME",
	16: "TXT",
	15: "MX",
}

export default class implements m.ClassComponent {
	static title = "DNS Lookup"

	private host: Stream<string> = Stream("sharats.me")
	private result: null | DNSResult = null
	private isLoading = false

	view(): m.Children {
		return m(".container", [
			m("h1", "DNS Lookup"),
			m("form.hstack.gap-2.mb-4", [
				m(Input, {
					class: "w-auto",
					model: this.host,
					placeholder: "Domain",
				}),
				m(".btn-group", [
					m(Button, { appearance: "outline-primary", onclick: () => this.resolve("A") }, "A"),
					m(Button, { appearance: "outline-primary", onclick: () => this.resolve("AAAA") }, "AAAA"),
					m(Button, { appearance: "outline-primary", onclick: () => this.resolve("CNAME") }, "CNAME"),
					m(Button, { appearance: "outline-primary", onclick: () => this.resolve("TXT") }, "TXT"),
					m(Button, { appearance: "outline-primary", onclick: () => this.resolve("MX") }, "MX"),
				]),
			]),
			this.result != null && this.result.Answer == null && m(".alert.alert-info", "No records found."),
			this.result != null && this.result.Status != 0 && m(".alert.alert-danger", "Error: " + this.result.Comment),
			this.result?.Answer != null && m(".table-responsive", m("table.table.table-bordered.table-hover", [
				m("thead", m("tr", [
					m("th", { scope: "col" }, "Type"),
					m("th", { scope: "col" }, "Value"),
					m("th", { scope: "col" }, "TTL"),
				])),
				m("tbody", this.result.Answer.map((item) => m("tr", [
					m("th", { scope: "row" }, DNS_RR_NAMES[item.type]),
					m("td", m("code", String(item.data))),
					m("td", [item.TTL, " seconds"]),
				]))),
			])),
		])
	}

	resolve(type: string) {
		this.isLoading = true
		this.result = null
		// Ref: <https://developers.google.com/speed/public-dns/docs/doh/json>.
		m.request(`https://dns.google.com/resolve?name=${ this.host() }&type=${ type }`)
			.then((result: any) => {
				this.result = result
				this.isLoading = false
			})
	}

}
