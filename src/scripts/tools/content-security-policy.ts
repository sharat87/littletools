import m from "mithril"
import Stream from "mithril/stream"
import { Input, Textarea, Button, CopyButton } from "../components"

// TODO: Allow pasting an escaped value from NGINX config.
// TODO: Common heuristic suggestions. Like if Google maps is allowed in `script-src`, they probably also need it in `style-src`, etc.

function extractCSPFromInput(input: string): string {
	const nginxMatch = input.match(/^add_header\s+'?Content-Security-Policy'?\s+(.+);$/i)
	// TODO: Support valid NGINX header: `add_header "X-XSS-Protection" "1; mode=block";`.
	if (nginxMatch != null) {
		let headerValuePart = nginxMatch[1]
		if (headerValuePart.startsWith("'") && headerValuePart.endsWith("'")) {
			headerValuePart = headerValuePart.slice(1, headerValuePart.length - 1).replace(/\\'/g, "'")
		} else if (headerValuePart.startsWith('"') && headerValuePart.endsWith('"')) {
			headerValuePart = headerValuePart.slice(1, headerValuePart.length - 1).replace(/\\"/g, '"')
		}
		return headerValuePart
	}

	const caddyMatch = input.match(/^header\s+Content-Security-Policy\s+"(.+)"$/i)
	if (caddyMatch != null) {
		return caddyMatch[1]
	}

	// PHP: `header("X-Name: value");`
	// Apache (.htaccess):
	// <IfModule mod_headers.c>
	//   Header set X-XSS-Protection "1; mode=block"
	// </IfModule>

	return input
}

function parseCSP(value: string): null | Record<string, string[]> {
	if (value === "") {
		return null
	}

	const directives = value.split(/\s*;\s*/)
	const data: Record<string, string[]> = {}

	for (const directive of directives) {
		const parts = directive.split(/\s+/)
		data[parts[0]] = parts.slice(1)
	}

	return data
}

function formatCSPInput(input: string): string {
	// TODO: Format NGINX or Caddy header lines, if that's what the input is.
	return input.replace(/;\s*/g, ";\n").replace(/;?\s*$/, ";\n")
}

const policyDescriptions: Record<string, string> = {
	// TODO: List the ones that are falling back to `default-src` in the current value.
	"default-src": "Default fallback policy for any resource not explicitly defined. Note that not all policies fall back to this.",
	"script-src": "Scripts can be loaded only from these destinations.",
	"connect-src": "Allowed endpoints for access with <code>XmlHttpRequest</code>, <code>fetch</code>, etc.",
	"img-src": "Allowed hosts for <code>src</code> attributes of <code>img</code> elements.",
	"media-src": "Allowed hosts for <code>src</code> attributes of <code>video</code>, <code>audio</code> and other media elements.",
	"style-src": "Allowed sources for loading styles.",
}

export default class {
	private input: Stream<string>
	private value: Stream<string>
	private singleLineValue: Stream<string>
	private nginxConfig: Stream<string>
	private caddyConfig: Stream<string>
	private parsedValue: Stream<null | Record<string, string[]>>
	private separateValues: Record<string, Stream<string>>
	private currentlyEditing: Stream<string>

	static title = "Content-Security-Policy"

	constructor() {
		this.currentlyEditing = Stream("")
		this.input = Stream("script-src 'self'")

		this.value = this.input.map(extractCSPFromInput)

		this.singleLineValue = this.value.map((value) => {
			return value.split("\n").join(" ").trim()
		})

		this.nginxConfig = this.singleLineValue.map((value) => {
			return `add_header Content-Security-Policy "${value}"`
		})

		this.caddyConfig = this.singleLineValue.map((value) => {
			return `header Content-Security-Policy "${value}"`
		})

		this.parsedValue = this.value.map(parseCSP)

		this.separateValues = {}
	}

	view(vnode: m.Vnode): m.Children {
		const parsedValue = this.parsedValue()

		const policyRows = []
		if (parsedValue != null) {
			let i = 0
			for (const [key, val] of Object.entries(parsedValue)) {
				policyRows.push(m("tr", [
					m("td", ++i),
					m("td", key),
					m("td", m("pre", val?.join("\n"))),
					// m("td", m(
					// 	Textarea,
					// 	{
					// 		model: this.getStreamForDirective(key),
					// 	},
					// 	val?.join("\n")),
					//  ),
					m("td", m.trust(policyDescriptions[key])),
					// TODO: Show docs link for each policy type.
				]))
			}
		}

		// TODO: A UI to *add* a new directive to the CSP.
		return m(".h100.pa1", [
			m("h1", "Content-Security-Policy Header"),
			m(Textarea, {
				rows: 12,
				placeholder: "Paste a content-security-policy here, or an NGINX header config, or a Caddy header config",
				model: this.input,
				onfocus: (event: FocusEvent) => {
					this.currentlyEditing("input")
				},
				style: {
					width: "80%",
				},
			}),
			m("p", [
				m(Button, {
					onclick: () => {
						this.input(formatCSPInput(this.input()))
					},
				}, "Format"),
				m(CopyButton, { content: this.singleLineValue }, "Copy as one line"),
				m(
					CopyButton,
					{
						content: () => {
							return location + "?i=" + atob(this.input())
						},
					},
					"Copy Permalink",
				),
			]),
			parsedValue != null && m("table.td-align-top", [
				m("tr", [
					m("th", "#"),
					m("th", "Resource"),
					m("th", "Value"),
					m("th", "Notes"),
				]),
				...policyRows,
			]),
			m("p", "Use in your NGINX config:"),
			m("pre", this.nginxConfig()),
			m("p", "Use in your Caddy config:"),
			m("pre", this.caddyConfig()),
			m("details", [
				m("summary", "Parsed data"),
				m("pre", JSON.stringify(this.parsedValue(), null, 2)),
			]),
		])
	}

	getStreamForDirective(name: string): Stream<string> {
		if (this.separateValues[name] == null) {
			const st = this.separateValues[name] = Stream("")
			this.parsedValue.map((directives) => {
				st(directives[name])
			})
			st.map((value) => {
				this.recomputeFullValue()
			})
		}
		return this.separateValues[name]
	}

	recomputeFullValue(): void {
		for (const [name, value] of Object.entries(this.separateValues)) {

		}
	}

}
