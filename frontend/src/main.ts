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
		return m("nav.navbar.py-0.px-2.border-end", m(m.route.Link, {
			href: "/",
			class: "navbar-brand",
		}, "LittleTools"))
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

		return m(".list-group.list-group-flush.border-end.border-top.h-100.flex-grow-1.overflow-auto", toolList)
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
		"/:tool": {
			onmatch(args: any): void {
				document.title = toolsBySlug[args.tool].title + " — LittleTools"
			},
			// FIXME: State of tools is not persisted when switching between tools.
			render(vnode: m.VnodeDOM<{ tool: string }>) {
				return toolsBySlug[vnode.attrs.tool] == null ? (m.route as any).SKIP : m(Layout, m(
					toolsBySlug[vnode.attrs.tool],
					{
						oncreate(vnode: m.VnodeDOM) {
							(
								vnode.dom.querySelector("[autofocus]") as HTMLElement
								?? vnode.dom.querySelector("input, textarea") as HTMLElement
							)?.focus()
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

}
