import m from "mithril"
import base64 from "./tools/base64"
import rot13Tool from "./tools/rot13"
import jsonTool from "./tools/json"
import urlEncodeTool from "./tools/url-encode"
import unixPermissionsTool from "./tools/unix-permissions"
import csvConverterTool from "./tools/csv-converter"
import cronParserTool from "./tools/cron-parser"
import contentSecurityPolicyTool from "./tools/content-security-policy"
import iframeTool from "./tools/iframe"

window.addEventListener("load", main)

interface ToolComponent extends m.Component {
	title: string
	slug?: string
}

const tools: ToolComponent[] = [
	base64,
	rot13Tool,
	jsonTool,
	urlEncodeTool,
	unixPermissionsTool,
	csvConverterTool,
	cronParserTool,
	contentSecurityPolicyTool,
	iframeTool,
]

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
		return m("header.pa1", m("h1", "Little tools by Shri"))
	}
}

class Aside {
	view(): m.Children {
		const toolList: m.Children = [
			m(
				m.route.Link,
				{
					href: "/",
					class: "tool" + (m.route.get() === "/" ? " active" : ""),
				},
				"Home",
			)
		]

		for (const component of tools) {
			const slug = component.slug
			const href = "/tool/" + slug
			toolList.push(m(
				m.route.Link,
				{
					href,
					class: "tool" + (m.route.get() === href ? " active" : ""),
				},
				component.title,
			))
		}

		return m("aside", toolList)
	}
}

function main() {
	const root = document.createElement("div")
	root.id = "root"
	document.body.appendChild(root)

	m.route.prefix = ""
	m.route(root, "/", {
		"/": {
			view(vnode: m.Vnode): m.Children {
				return m(Layout, m("h1", "Explore tools on the left"))
			},
		},
		"/tool/:tool": {
			// FIXME: State of tools is not persisted when switching between tools.
			render(vnode: m.Vnode) {
				return toolsBySlug[vnode.attrs.tool] == null ? m.route.SKIP : m(Layout, m(
					toolsBySlug[vnode.attrs.tool],
					{
						oncreate(vnode: m.VnodeDOM) {
							(vnode.dom.querySelector("[autofocus]") ?? vnode.dom.querySelector("input, textarea"))?.focus()
						},
					},
				))
			},
		},
		// TODO: "/:404...": errorPageComponent,
	})
}
