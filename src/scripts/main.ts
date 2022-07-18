import m from "mithril"
import allTools from "./tools/*"

window.addEventListener("load", main)

interface ToolComponent extends m.Component {
	title: string
	slug?: string
}

// Glob imports: <https://parceljs.org/features/dependency-resolution/#glob-specifiers>.
const tools: ToolComponent[] = Object.values(allTools).map((t: { default: ToolComponent }) => t.default)

const toolsBySlug: Record<string, m.Component> = {}

for (const component of tools) {
	if (component.slug == null) {
		component.slug = component.title.replace(/\W+/g, "-").toLowerCase()
	}
	toolsBySlug[component.slug] = component
}

class Layout {
	view(vnode: m.Vnode): m.Children {
		return [
			m(Header),
			m(Aside),
			m("main", vnode.children),
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

		for (const component of tools) {
			const slug = component.slug
			const href = "/" + slug
			toolList.push(m(
				m.route.Link,
				{
					href,
					class: itemCls + (m.route.get() === href ? " active" : ""),
				},
				component.title,
			))
		}

		return m("aside.list-group.list-group-flush.border-end.border-top", toolList)
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
			view(): m.Children {
				return m(Layout, m(HomeView))
			},
		},
		"/:tool": {
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
}
