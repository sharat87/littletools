import m from "mithril"
import { Button, CodeBlock, CodeMirror, CopyButton, Icon, Notebook, Textarea, ToolView } from "~/src/components"
import { Text } from "@codemirror/state"
import { EditorView, ViewUpdate } from "@codemirror/view"
import { parser } from "../parsers/content-security-policy"
import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import * as CMAutocomplete from "@codemirror/autocomplete"
import * as Toaster from "../toaster"
import { request } from "~src/utils"
import Stream from "mithril/stream"

// TODO: Allow pasting an escaped value from NGINX config.
// TODO: Common heuristic suggestions. Like if Google maps is allowed in `script-src`, they probably also need it in `style-src`, etc.
// TODO: Highlight Deprecated and Experimental directives.
// TODO: Handle repeated directives correctly.

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

const theme = [
	EditorView.theme({
		".cm-activeLine, .cm-activeLineGutter": {
			backgroundColor: "var(--bs-light-bg-subtle)",
		},
		".cm-gutters": {
			backgroundColor: "var(--bs-light-bg-subtle)",
		},
	}, {}),
	syntaxHighlighting(HighlightStyle.define([
		{
			tag: t.keyword,
			color: "var(--bs-warning-text-emphasis)",
		},
	])),
]

export const CSPLang = LRLanguage.define({
	parser: parser.configure({
		props: [
			styleTags({
				Name: t.tagName,
				UnknownName: t.invalid,
				Value: t.string,
			}),
		],
	}),
})

const directiveCompleter = CMAutocomplete.completeFromList(ALL_DIRECTIVES.map(
	(directive: string) => ({ label: directive, type: "keyword" }),
))

const CSPAutocomplete = CSPLang.data.of({
	autocomplete: (context: CMAutocomplete.CompletionContext) => {
		return context.matchBefore(/\s*/)?.from === 0 || context.tokenBefore(["Name", "Term"]) != null
			? directiveCompleter(context) : null
	},
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

export function parseCSP(value: string): null | Record<string, string> {
	if (value === "") {
		return null
	}

	const directives = value.split(/\s*;\s*/)
	directives.sort()

	const data: Record<string, string> = {}

	for (const directive of directives) {
		const [key, ...value] = directive.split(/\s+/)
		if (key !== "") {
			data[key] = value?.join(" ") ?? ""
		}
	}

	return data
}

export default class extends ToolView {
	static title = "Content-Security-Policy"

	private editor: Stream<null | EditorView> = Stream(null)
	private parsedValue: Record<string, string> = {}
	private showNewModal = false
	private isLoadingCSP = false

	oncreate(vnode: m.VnodeDOM): void {
		this.parseDirectives()
	}

	headerEndView(): m.Children {
		return m(CopyButton, {
			content: () => {
				return location + "?i=" + window.atob(this.getFullInput())
			},
		}, "Permalink")
	}

	mainView(): m.Children {
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
			appearance: "primary",
			onclick: () => {
				this.showNewModal = true
			},
		}, [m(Icon, "add_circle"), m.trust("Add Policy&hellip;")]))))

		return [
			m(".editor"),
			m(CodeMirror, {
				hook: this.editor,
				doc: "script-src 'self'; frame-ancestors 'self';",
				onDocChanged(_: ViewUpdate) {
					this.parseDirectives()
				},
				extensions: [
					theme,
					new LanguageSupport(CSPLang, [CSPAutocomplete]),
				],
			}),
			m(".btn-toolbar.my-2.gap-2", [
				m(Button, {
					appearance: "outline-primary",
					size: "sm",
					onclick: () => {
						this.generateInputFromParsed()
					},
				}, [m(Icon, "integration_instructions"), "Format"]),
				m(CopyButton, {
					appearance: "outline-primary",
					content: input.replace(/\s+/g, " "),
				}, "Copy as one line"),
				m(Button, {
					appearance: "outline-primary",
					size: "sm",
					isLoading: this.isLoadingCSP,
					onclick: async () => {
						const url = prompt("Paste URL to fetch CSP from:")
						if (url == null) {
							return
						}
						this.isLoadingCSP = true
						m.redraw()
						const response = await request<{
							values: null | string[]
						}>("/x/csp?url=" + encodeURIComponent(url))
						if (response.values == null) {
							Toaster.push({
								title: "No CSP",
								body: "No CSP found in the given URL",
								appearance: "warning",
							})
						} else {
							Toaster.push({
								title: "Got CSP",
								body: `Found ${ response.values.length } CSP value${ response.values.length > 1 ? "s" : "" } for the given URL`,
								appearance: "success",
							})
							this.editor()?.dispatch({
								changes: {
									from: 0,
									to: this.editor()?.state.doc.length,
									insert: response.values.join("\n"),
								},
							})
							this.parseDirectives()
						}
						this.isLoadingCSP = false
					},
				}, [m(Icon, "cloud_download"), m.trust("Fetch from URL&hellip;")]),
			]),
			policyRows.length > 0 && m("table.table.table-bordered.td-align-top", [
				m("thead", m("tr", [
					m("th", { scope: "col" }, "Resource"),
					m("th", { scope: "col" }, "Value"),
				])),
				m("tbody", policyRows),
			]),
			m(Notebook, {
				tabs: {
					NGINX: () => m(CodeBlock, `add_header Content-Security-Policy "${ input }";`),
					Caddy: () => m(CodeBlock, `header Content-Security-Policy "${ input }"`),
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
				m(".modal.d-block.pe-none", m(".modal-dialog.modal-dialog-scrollable", m(".modal-content", [
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
								this.editor()?.state.doc.append(Text.of([` ${ name } 'self';`]))
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
		]
	}

	private getFullInput() {
		return this.editor()?.state.doc.toString() ?? ""
	}

	private parseDirectives() {
		const editor = this.editor()
		if (editor != null) {
			this.parsedValue = parseCSP(extractCSPFromInput(editor.state.doc.toString())) ?? {}
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
		this.editor()?.dispatch({
			changes: {
				from: 0,
				to: this.editor()?.state.doc.length,
				insert: newInput.trim(),
			},
		})
	}

}
