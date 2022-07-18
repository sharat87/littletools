import m from "mithril"
import Stream from "mithril/stream"
import { Button, Input, Select } from "../components"
import doh from "dohjs"

// TODO: Allow pasting an escaped value from NGINX config.
// TODO: Common heuristic suggestions. Like if Google maps is allowed in `script-src`, they probably also need it in `style-src`, etc.

export default {
	title: "DNS Lookup",
	oninit,
	view,
}

interface OtherAnswer {
	name: string
	ttl: number
	class: string
	type: "A" | "AAAA" | "CNAME" | "TXT"
	data: [Uint8Array]
}

interface MXAnswer {
	name: string
	ttl: number
	class: string
	type: "MX"
	data: {
		exchange: string
		preference: number
	}
}

type DNSAnswer = MXAnswer | OtherAnswer

interface State {
	resolver: doh.DohResolver
	host: Stream<string>
	type: Stream<string>
	results: null | DNSAnswer[]
}

function oninit(vnode: m.Vnode<never, State>) {
	vnode.state.resolver = new doh.DohResolver("https://1.1.1.1/dns-query")
	vnode.state.host = Stream("sharats.me")
	vnode.state.type = Stream("A")
	vnode.state.results = null
}

function view(vnode: m.Vnode<never, State>): m.Children {
	return m(".container", [
		m("h1", "DNS Lookup"),
		m(
			"form.row",
			{
				onsubmit: (event: SubmitEvent) => {
					event.preventDefault()
					vnode.state.results = null
					vnode.state.resolver.query(vnode.state.host(), vnode.state.type())
						.then((response) => {
							vnode.state.results = response.answers
							m.redraw()
						})
				},
			},
			[
				m(".col-auto", m(Input, {
					class: "form-control",
					model: vnode.state.host,
					placeholder: "Domain",
				})),
				// TODO: Use a radio button list here, to save a click!
				m(".col-auto", m(Select, {
					class: "form-control form-select",
					model: vnode.state.type,
					options: {
						"A": "A",
						"AAAA": "AAAA",
						"CNAME": "CNAME",
						"TXT": "TXT",
						"MX": "MX",
					},
				})),
				m(".col-auto", m(Button, "Look up")),
			],
		),
		vnode.state.results != null && m("table", [
			m("tr", [
				m("th", "Type"),
				m("th", "Value"),
				m("th", "TTL"),
			]),
			vnode.state.results.map((item) => m("tr", [
				m("td", item.type),
				m("td", m("code", item.type === "MX" ? `${ item.data.preference } ${ item.data.exchange }` : String(item.data))),
				m("td", item.ttl),
			])),
		]),
	])
}
