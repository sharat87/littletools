import m from "mithril"
import * as Omnibar from "./omnibar"
import * as Toaster from "./toaster"
import toolsBySlug from "./toolpack"
import { Button, Icon, ToolContainer } from "~src/components"
import Bus from "~src/bus"
import { EditorView } from "@codemirror/view"
import { EditorSelection } from "@codemirror/state"

window.addEventListener("load", main)

// Injected by esbuild.
declare const IS_DEV: boolean
declare const BUILD_GIT_SHA: string

class Layout implements m.ClassComponent<{ isKioskMode?: boolean }> {
	private isDragging = false

	view(vnode: m.Vnode<{ isKioskMode?: boolean }>): m.Children {
		if (vnode.attrs.isKioskMode) {
			return m(".container-lg.px-0", vnode.children)
		}

		return [
			m(".container-fluid.px-0.h-100.hstack", {
				ondragover: (event: DragEvent) => {
					this.isDragging = true
					event.preventDefault()
				},
				ondragleave: () => {
					this.isDragging = false
				},
				ondrop: (event: DragEvent) => {
					this.isDragging = false
					event.preventDefault()
				},
			}, [
				m(".h-100.px-0.d-flex.flex-column.d-print-none", { style: { width: "250px" } }, [
					m(Header),
					m(Aside, { isDragging: this.isDragging }),
				]),
				m(".h-100.flex-1.position-relative", { style: { width: "calc(100vw - 250px)" } }, vnode.children),
			]),
			m(Omnibar.View),
			m(Toaster.View),
		]
	}
}

class Header {
	private showDropdown: boolean = false

	view(): m.Children {
		return m("nav.navbar.py-0.px-2.border-end", [
			m(m.route.Link, {
				href: "/",
				class: "navbar-brand flex-1",
			}, "LittleTools"),
			m(".btn-group.btn-group-sm", [
				m(Button, {
					appearance: "secondary",
					tooltip: "Search (Ctrl+Shift+K)",
					onclick: () => {
						Omnibar.toggle()
					},
				}, m(Icon, "search")),
				m(".btn-group.btn-group-sm", [
					m(Button, {
						class: "dropdown-toggle",
						appearance: "secondary",
						onclick: (event: MouseEvent) => {
							event.preventDefault()
							this.showDropdown = !this.showDropdown
						},
					}),
					this.showDropdown && m("ul.dropdown-menu.show.top-100", {
						onclick: (_: MouseEvent) => {
							this.showDropdown = false
						},
					}, [
						m("li", m("a.dropdown-item", {
							href: "https://github.com/sharat87/littletools",
							target: "_blank",
						}, "GitHub Project")),
					]),
				]),
			]),
		])
	}
}

class Aside implements m.ClassComponent<{ isDragging: boolean }> {
	private draggingOverTool: null | string = null

	view(vnode: m.Vnode<{ isDragging: boolean }>): m.Children {
		const toolList: m.Children = []

		for (const [slug, component] of Object.entries(toolsBySlug)) {
			if (component.isHidden || component.isKioskMode || (vnode.attrs.isDragging && !component.acceptsDroppedFiles)) {
				continue
			}
			const href = "/" + slug
			toolList.push(m(
				m.route.Link,
				{
					href,
					class: "list-group-item list-group-item-action py-1 pe-1 hstack justify-content-between"
						+ (m.route.get().split("?", 2)[0] === href ? " active" : "")
						+ (vnode.attrs.isDragging ? " py-4" : " border-bottom-0")
						+ (this.draggingOverTool === slug ? " text-bg-primary" : ""),
					ondragover: (event: DragEvent) => {
						event.preventDefault()
						this.draggingOverTool = slug
					},
					ondragleave: () => {
						this.draggingOverTool = null
					},
					ondrop: (event: DragEvent) => {
						event.preventDefault()
						this.draggingOverTool = null
						if (component.acceptsDroppedFiles) {
							if (event.dataTransfer?.items) {
								for (const item of event.dataTransfer.items) {
									if (item.kind === "file") {
										const file = item.getAsFile()
										if (file != null) {
											Bus.pushToBucket(file)
										}
										break
									}
								}

							} else {
								// Use DataTransfer interface to access the file(s)
								// New interface handling: vnode.state.files = event.dataTransfer.files

							}
						}
						(event.target as HTMLAnchorElement).click()
					},
				},
				[
					component.title,
					component.acceptsDroppedFiles && m(Icon, { tooltip: "Drop a file here to open in tool." }, "publish"),
				],
			))
		}

		return m(".list-group.list-group-flush.border-end.border-top.h-100.flex-grow-1.overflow-auto.pb-5", toolList)
	}
}

class HomeView implements m.ClassComponent {
	view() {
		return m(ToolContainer, [
			m("h1", "Explore tools on the left"),
			m("p.lead", "Little developer power tools, that I wish existed."),
			m("p", "These tools are built to solve problems I was facing, and so are poor in terms of documentation and user experience. A deliberate focus is given to function over form. Expect inconvenience."),
			m("ul", [
				m("li", [
					m(m.route.Link, { href: "/json" }, "JSON Formatter"),
					": Supports ",
					m("a", { href: "https://www.json.org/json-en.html" }, "JSON"),
					", ",
					m("a", { href: "https://json5.org/" }, "JSON5"),
					", ",
					m("a", { href: "https://www.mongodb.com/docs/manual/core/document/" }, "MongoDB Documents"),
					", and then some, without using ",
					m("code", "eval"),
					".",
				]),
				m("li", [
					m(m.route.Link, { href: "/pdf-remove-password" }, "PDF Remove Password"),
					": Give PDF, and a password, and get a PDF without password.",
				]),
				m("li", [
					m(m.route.Link, { href: "/send-mail" }, "Send Mail"),
					": Send an email with the given SMTP server. Check if and how your SMTP configuration works.",
				]),
			]),
			m("p.small.mt-5", [
				"A project by ",
				m("a", { href: "https://sharats.me", target: "_blank" }, "Shri"),
				". Source on ",
				m("a", { href: "https://github.com/sharat87/littletools", target: "_blank" }, "GitHub"),
				". Built from ",
				m("a", { href: "https://github.com/sharat87/littletools/tree/" + BUILD_GIT_SHA }, BUILD_GIT_SHA.slice(0, 6)),
				".",
			]),
		])
	}
}

function main() {
	IS_DEV && (function start() {
		const es = new EventSource("/esbuild")
		es.addEventListener("change", () => location.reload())
		es.onerror = () => {
			es.close()
			setTimeout(start, 900)
		}
	})()

	const root = document.createElement("div")
	root.className = "root h-100"
	document.body.appendChild(root)

	m.route.prefix = ""
	m.route(root, "/", {
		"/": {
			onmatch(): void {
				document.title = "LittleTools"
			},
			render(): m.Children {
				return m(Layout, m(HomeView))
			},
		},
		"/:key": {
			onmatch(args: any): void {
				document.title = toolsBySlug[args.key].title + " — LittleTools"
			},
			render(vnode: m.VnodeDOM<{ key: string }>) {
				return toolsBySlug[vnode.attrs.key] == null ? (m.route as any).SKIP : m(
					Layout,
					{
						isKioskMode: toolsBySlug[vnode.attrs.key].isKioskMode,
					},
					m(toolsBySlug[vnode.attrs.key], {
						oncreate(vnode: m.VnodeDOM) {
							const input = (
								vnode.dom.querySelector("[autofocus]")
								?? vnode.dom.querySelector("input:not([type='checkbox']), textarea, .cm-editor")
							) as HTMLElement
							if (input == null) {
								return
							} else if (input.matches(".cm-editor")) {
								const editor = (input as any).CodeMirror as EditorView
								if (editor != null) {
									editor.focus()
									editor.dispatch({
										selection: EditorSelection.single(0, editor.state.doc.length),
									})
								}
							} else {
								input?.focus()
								if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
									input.select()
								}
							}
						},
					}),
				)
			},
		},
		// TODO: "/:404...": errorPageComponent,
	})

	window.addEventListener("message", (event: MessageEvent) => {
		Toaster.push({
			title: "Received Message",
			body: event.data,
		})
		m.redraw()
	})

	document.body.addEventListener("mouseover", (event: MouseEvent) => {
		const target = (event.target as HTMLElement).closest("[tooltip]") as HTMLElement
		for (const t of document.querySelectorAll(".tooltip")) {
			t.remove()
		}
		const text = target?.getAttribute("tooltip")
		if (text == null) {
			return
		}
		const rect = target.getBoundingClientRect()
		document.body.insertAdjacentHTML(
			"beforeend",
			`<div role="tooltip" class="tooltip bs-tooltip-bottom show fade position-absolute" style="top: ${ rect.top + rect.height - 6 }px; left: ${ rect.left }px; transform: translateX(calc(${ rect.width / 2 }px - 50%))"><div class="tooltip-arrow position-relative w-100 text-center"></div><div class="tooltip-inner shadow-sm">${ text }</div></div>`,
		)
	})
}
