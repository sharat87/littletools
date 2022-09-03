import m from "mithril"
import * as Omnibar from "./omnibar"
import * as Toaster from "./toaster"
import toolsBySlug from "./toolpack"

window.addEventListener("load", main)

class Layout {
	view(vnode: m.Vnode): m.Children {
		return [
			m(".container-fluid.px-0.h-100", m(".row.h-100.m-0", [
				m(".col-2.h-100.px-0.d-flex.flex-column", { style: { minWidth: "250px" } }, [
					m(Header),
					m(Aside),
				]),
				m(".col.h-100.overflow-auto", vnode.children),
			])),
			m(Omnibar.View),
			m(Toaster.View),
		]
	}
}

class Header {
	view(): m.Children {
		return m("nav.navbar.py-0.px-2.border-end", [
			m(m.route.Link, {
				href: "/",
				class: "navbar-brand",
			}, "LittleTools"),
			m(".nav-item.dropdown", [
				m("a.nav-link.dropdown-toggle", {
					href: "#",
					onclick: (event: MouseEvent) => {
						event.preventDefault()
						;(event.target as HTMLAnchorElement).classList.add("show")
						;(event.target as HTMLAnchorElement).nextElementSibling?.classList.add("show")
					},
				}),
				m("ul.dropdown-menu", {
					onclick: (event: MouseEvent) => {
						;(event.target as HTMLAnchorElement).closest(".dropdown-menu")!.classList.remove("show")
						;(event.target as HTMLAnchorElement).closest(".dropdown-menu")!.previousElementSibling?.classList.remove("show")
					},
				}, [
					m("li", m("a.dropdown-item", {
						href: "https://github.com/sharat87/littletools",
						target: "_blank",
					}, "GitHub Project")),
				]),
			]),
		])
	}
}

class Aside {
	view(): m.Children {
		const itemCls = "list-group-item border-bottom-0 py-1"
		const toolList: m.Children = [
			m(
				m.route.Link,
				{
					href: "/",
					class: itemCls + (m.route.get() === "/" ? " active" : ""),
				},
				"Home",
			),
		]

		for (const [slug, component] of Object.entries(toolsBySlug)) {
			const href = "/" + slug
			toolList.push(m(
				m.route.Link,
				{
					href,
					class: itemCls + (m.route.get().split("?", 2)[0] === href ? " active" : ""),
				},
				component.title,
			))
		}

		return m(".list-group.list-group-flush.border-end.border-top.h-100.flex-grow-1.overflow-auto.pb-5", toolList)
	}
}

class HomeView implements m.ClassComponent {
	view() {
		return m(".container", [
			m("h1", "Explore tools on the left"),
			m("p", "Little developer power tools, that I wish existed."),
			m("p", ["A project by ", m("a", { href: "https://sharats.me" }, "Shri"), "."]),
		])
	}
}

function main() {
	const root = document.createElement("div")
	root.className = "root h-100"
	document.body.appendChild(root)

	m.route.prefix = ""
	m.route(root, "/", {
		"/": {
			onmatch(): void {
				document.title = "LittleTools"
			},
			view(): m.Children {
				return m(Layout, m(HomeView))
			},
		},
		"/:key": {
			onmatch(args: any): void {
				document.title = toolsBySlug[args.key].title + " — LittleTools"
			},
			render(vnode: m.VnodeDOM<{ key: string }>) {
				return toolsBySlug[vnode.attrs.key] == null ? (m.route as any).SKIP : m(Layout, m(
					toolsBySlug[vnode.attrs.key],
					{
						oncreate(vnode: m.VnodeDOM) {
							const input = (
								vnode.dom.querySelector("[autofocus]")
								?? vnode.dom.querySelector("input:not([type='checkbox']), textarea")
							) as HTMLElement
							input?.focus()
							if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
								input.select()
							}
						},
					},
				))
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
