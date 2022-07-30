import m from "mithril"
import Stream from "mithril/stream"
import { Button, CopyButton, Notebook, Pre, Textarea } from "../components"
import { Text } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { parser } from "../parsers/content-security-policy"
import { LanguageSupport, LRLanguage } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { completeFromList } from "@codemirror/autocomplete"
import { basicSetup } from "codemirror"

// TODO: Allow pasting an escaped value from NGINX config.
// TODO: Common heuristic suggestions. Like if Google maps is allowed in `script-src`, they probably also need it in `style-src`, etc.
// TODO: Highlight Deprecated and Experimental directives.

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

const parserWithMetadata = parser.configure({
	props: [
		styleTags({
			Name: t.keyword,
			Value: t.string,
		}),
	],
})

export const exampleLanguage = LRLanguage.define({
	parser: parserWithMetadata,
	languageData: {
		commentTokens: { line: ";" },
	},
})

const exampleCompletion = exampleLanguage.data.of({
	autocomplete: completeFromList([
		{ label: "defun", type: "keyword" },
		{ label: "defvar", type: "keyword" },
		{ label: "let", type: "keyword" },
		{ label: "cons", type: "function" },
		{ label: "car", type: "function" },
		{ label: "cdr", type: "function" },
	]),
})

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

function parseCSP(value: string): null | Record<string, string> {
	if (value === "") {
		return null
	}

	const directives = value.split(/\s*;\s*/)
	directives.sort()

	const data: Record<string, string> = {}

	for (const directive of directives) {
		const [key, value] = directive.split(/\s+/, 2)
		if (key !== "") {
			data[key] = value ?? ""
		}
	}

	return data
}

export default class implements m.ClassComponent {
	private editor: null | EditorView
	private nginxConfig: string
	private caddyConfig: string
	private parsedValue: Record<string, string>
	private currentlyEditing: Stream<string>
	private showNewModal: boolean
	private currentTab: "nginx" | "caddy"

	static title = "Content-Security-Policy"

	constructor() {
		this.nginxConfig = this.caddyConfig = ""
		this.editor = null
		this.parsedValue = {}
		this.showNewModal = false
		this.currentTab = "nginx"

		this.currentlyEditing = Stream("")
	}

	oncreate(vnode: m.VnodeDOM): void {
		let input = "script-src 'self'; frame-ancestors 'self';"
		this.editor = new EditorView({
			doc: input,
			extensions: [
				keymap.of(defaultKeymap),
				EditorView.updateListener.of(update => {
					if (update.docChanged && this.editor?.hasFocus) {
						this.parseDirectives()
						m.redraw()
					}
				}),
				basicSetup,
				new LanguageSupport(exampleLanguage, [exampleCompletion]),
			],
			parent: vnode.dom.querySelector(".editor")!,
		})
		this.parseDirectives()
	}

	view(): m.Children {
		const input = this.getFullInput()

		const policyRows = []
		if (this.parsedValue != null) {
			for (const [key, val] of Object.entries(this.parsedValue)) {
				policyRows.push(m("tr", [
					m("td", key),
					m("td", m(Textarea, {
						class: "font-monospace",
						rows: 3,
						value: val,
						onChange: (value: string) => {
							this.onResourceChanged(key, value)
						},
					})),
				]))
			}
		}

		policyRows.push(m("tr", m("td", { colspan: 2 }, m(Button, {
			onclick: () => {
				this.showNewModal = true
			},
		}, m.trust("Add Policy&hellip;")))))

		return m(".container.pb-5", [
			m("h1", "Content-Security-Policy"),
			m(".editor"),
			m(".btn-toolbar.my-2", m(".btn-group", [
				m(Button, {
					onclick: () => {
						this.generateInputFromParsed()
					},
				}, "Format"),
				m(CopyButton, { content: input.replace(/\s+/g, " ") }, "Copy as one line"),
				m(
					CopyButton,
					{
						content: () => {
							return location + "?i=" + window.atob(input)
						},
					},
					"Copy Permalink",
				),
			])),
			policyRows.length > 0 && m("table.table.table-bordered.td-align-top", [
				m("thead", m("tr", [
					m("th", { scope: "col" }, "Resource"),
					m("th", { scope: "col" }, "Value"),
				])),
				m("tbody", policyRows),
			]),
			m(Notebook, {
				tabs: {
					NGINX: () => m(Pre, `add_header Content-Security-Policy "${ input }";`),
					Caddy: () => m(Pre, `header Content-Security-Policy "${ input }"`),
				},
			}),
			// TODO: Also show as an HTML meta tag.
			m("h3.mt-3", "Similar Tools"),
			m("ul", [
				m("li", m("a", {
					href: "https://csp-evaluator.withgoogle.com/",
					target: "_blank",
				}, "CSP Evaluator")),
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
								this.editor?.state.doc.append(Text.of([` ${ name } 'self';`]))
								this.showNewModal = false
							},
						}, directive)),
					])),
				]))),
				m(".modal-backdrop.fade.show", {
					onclick: () => {
						this.showNewModal = false
					},
				}),
			],
		])
	}

	private getFullInput() {
		return this.editor?.state.doc.toString() ?? ""
	}

	private parseDirectives() {
		if (this.editor != null) {
			this.parsedValue = parseCSP(extractCSPFromInput(this.editor.state.doc.toString())) ?? {}
			m.redraw()
		}
	}

	private onResourceChanged(key: string, value: string) {
		this.parsedValue[key] = value
		this.generateInputFromParsed()
	}

	private generateInputFromParsed() {
		const keys = Object.keys(this.parsedValue)
		keys.sort()
		let newInput = ""
		for (const key of keys) {
			newInput += key + " " + this.parsedValue[key] + "; "
		}
		this.editor?.dispatch({
			changes: {
				from: 0,
				to: this.editor?.state.doc.length,
				insert: newInput.trim(),
			},
		})
	}

}
