import m from "mithril"
import Stream from "mithril/stream"
import { Button, CopyButton, Textarea } from "../components"

// TODO: Allow pasting an escaped value from NGINX config.
// TODO: Common heuristic suggestions. Like if Google maps is allowed in `script-src`, they probably also need it in `style-src`, etc.

const ALL_DIRECTIVES = [
	"child-src",
	"connect-src",
	"default-src",
	"font-src",
	"frame-src",
	"img-src",
	"manifest-src",
	"media-src",
	"object-src",
	"prefetch-src",
	"script-src",
	"script-src-elem",
	"script-src-attr",
	"style-src",
	"style-src-elem",
	"style-src-attr",
	"worker-src",
	"base-uri",
	"sandbox",
	"form-action",
	"frame-ancestors",
	"navigate-to",
	"report-uri",
	"report-to",
	"require-sri-for",
	"require-trusted-types-for",
	"trusted-types",
	"upgrade-insecure-requests",
	"block-all-mixed-content",
	"plugin-types",
	"referrer",
]

function extractCSPFromInput(input: string): string {
	const nginxMatch = input.match(/^add_header\s+'?Content-Security-Policy'?\s+(.+);$/i)
	// TODO: Support valid NGINX header: `add_header "X-XSS-Protection" "1; mode=block";`.
	if (nginxMatch != null) {
		let headerValuePart = nginxMatch[1]
		if (headerValuePart.startsWith("'") && headerValuePart.endsWith("'")) {
			headerValuePart = headerValuePart.slice(1, headerValuePart.length - 1).replace(/\\'/g, "'")
		} else if (headerValuePart.startsWith("\"") && headerValuePart.endsWith("\"")) {
			headerValuePart = headerValuePart.slice(1, headerValuePart.length - 1).replace(/\\"/g, "\"")
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
	directives.sort()

	const data: Record<string, string[]> = {}

	for (const directive of directives) {
		const [key, ...value] = directive.split(/\s+/)
		if (key !== "") {
			data[key] = value
		}
	}

	return data
}

export default class {
	private input: string
	private nginxConfig: string
	private caddyConfig: string
	private parsedValue: Record<string, string[]>
	private currentlyEditing: Stream<string>
	private showNewModal: boolean

	static title = "Content-Security-Policy"

	constructor() {
		this.input = this.nginxConfig = this.caddyConfig = ""
		this.parsedValue = {}
		this.showNewModal = false

		this.inputChanged("script-src 'self'; frame-ancestors 'self';")

		this.currentlyEditing = Stream("")
	}

	view(): m.Children {
		const parsedValue = this.parsedValue

		const policyRows = []
		if (parsedValue != null) {
			let i = 0
			for (const [key, val] of Object.entries(parsedValue)) {
				policyRows.push(m("tr", [
					m("td", key),
					m("td", m(
						Textarea,
						{
							class: "font-monospace",
							value: val?.join("\n"),
							onChange: (value: string) => {
								console.log("resource changed", key, value)
								this.onResourceChanged(key, value)
							},
						},
						val?.join("\n")),
					),
					// TODO: Show docs link for each policy type.
				]))
			}
		}

		policyRows.push(m("tr", m("td", { colspan: 2 }, m(Button, {
			onclick: (event: MouseEvent) => {
				this.showNewModal = true
			},
		}, "Add Policy"))))

		// TODO: A UI to *add* a new directive to the CSP.
		return m(".container.pb-5", [
			m("h1", "Content-Security-Policy Header"),
			m(Textarea, {
				rows: 6,
				placeholder: "Paste a content-security-policy here, or an NGINX header config, or a Caddy header config",
				value: this.input,
				onChange: (value: string) => {
					this.inputChanged(value)
				},
			}),
			m(".btn-toolbar.my-2", m(".btn-group", [
				m(Button, {
					onclick: () => {
						this.generateInputFromParsed()
					},
				}, "Format"),
				m(CopyButton, { content: this.input.replace(/\s+/g, " ") }, "Copy as one line"),
				m(
					CopyButton,
					{
						content: () => {
							return location + "?i=" + atob(this.input)
						},
					},
					"Copy Permalink",
				),
			])),
			parsedValue != null && m("table.table.table-bordered.td-align-top", [
				m("thead", m("tr", [
					m("th", { scope: "col" }, "Resource"),
					m("th", { scope: "col" }, "Value"),
				])),
				m("tbody", policyRows),
			]),
			m("p", "Use in your NGINX config:"),
			m("pre", this.nginxConfig),
			m("p", "Use in your Caddy config:"),
			m("pre", this.caddyConfig),
			m("h3", "Similar Tools"),
			m("ul", [
				m("li", m("a", { href: "https://csp-evaluator.withgoogle.com/", target: "_blank" }, "CSP Evaluator")),
			]),
			this.showNewModal && [
				m(".modal", { style: "display: block; pointer-events: none" }, m(".modal-dialog.modal-dialog-scrollable", m(".modal-content", [
					m(".modal-header", [
						m("h5.modal-title", "Add Policy"),
						m("button.btn-close", {
							onclick: () => {
								this.showNewModal = false
							},
						}),
					]),
					m(".modal-body", m("form", [
						ALL_DIRECTIVES.map(directive => m("button.btn.btn-light.d-block", {
							type: "button",
							onclick: (event: MouseEvent) => {
								const name = (event.target as HTMLButtonElement).innerText
								this.inputChanged(`${ this.input.replace(/\s*;*$/, "") }; ${ name } 'self';`)
								this.showNewModal = false
							},
						}, directive)),
					])),
					m(".modal-footer", [
						m("button.btn.btn-primary", {
							onclick: () => {
								const name = prompt("New policy name:")
								if (name == null) {
									return
								}

								if (this.parsedValue[name] != null) {
									alert("Policy already exists.")
								} else {
									this.inputChanged(`${ this.input.replace(/\s*;*$/, "") }; ${ name } 'self';`)
								}
							},
						}, "Add Policy"),
						m("button.btn.btn-secondary", {
							onclick: () => {
								this.showNewModal = false
							},
						}, "Cancel"),
					]),
				]))),
				m(".modal-backdrop.fade.show", {
					onclick: () => {
						this.showNewModal = false
					},
				}),
			],
		])
	}

	private setInput(value: string) {
		this.input = value
		this.nginxConfig = `add_header Content-Security-Policy "${ value }"`
		this.caddyConfig = `header Content-Security-Policy "${ value }"`
	}

	private inputChanged(value: string) {
		this.setInput(value)
		console.log("extracted", extractCSPFromInput(value))
		this.parsedValue = parseCSP(extractCSPFromInput(value)) ?? {}
	}

	private onResourceChanged(key: string, value: string) {
		this.parsedValue[key] = value.split(/\s+/)
		this.generateInputFromParsed()
	}

	private generateInputFromParsed() {
		const keys = Object.keys(this.parsedValue)
		keys.sort()
		let newInput = ""
		for (const key of keys) {
			newInput += key + " " + this.parsedValue[key].join(" ") + "; "
		}
		this.setInput(newInput.trim())
	}

}
