import m from "mithril"
import { CodeBlock, ToolView } from "~/src/components"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "codemirror"

const initialContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24" fill="none"
\t\tstroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
\t<rect x="18" y="20" width="20" height="24"/>
\t<script>alert("oh dear!")</script>
</svg>
`

export default class extends ToolView {
	static title = "VNode API from HTML"

	private editor: null | EditorView = null
	private vNodeCode: string = ""

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".editor-spot")
		if (spot != null) {
			this.editor = new EditorView({
				doc: initialContent,
				extensions: [
					keymap.of(defaultKeymap),
					basicSetup,
					EditorView.updateListener.of(update => {
						if (update.docChanged) {
							this.vNodeCode = convertHTMLToVNode(update.state.doc.toString())
							m.redraw()
						}
					}),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.vNodeCode = convertHTMLToVNode(this.editor.state.doc.toString())
			m.redraw()
		}
	}

	mainView(): m.Children {
		return [
			m("h1", "HTML to VNode API"),
			m("p", "This is incomplete, and a WIP."),
			m(".editor-spot"),
			m(CodeBlock, { class: "flex-1" }, this.vNodeCode),
		]
	}

}

function convertHTMLToVNode(html: string): string {
	const fragment = document.createRange().createContextualFragment(html)
	return recursiveMakeVNode(fragment)
}

function recursiveMakeVNode(root: Node): string {
	const lines = []
	for (const el of root.childNodes) {
		if (el instanceof Element) {
			let attrs = ""
			for (const attr of el.attributes) {
				let name = attr.name
				if (name.search(/-/) >= 0) {
					name = `"${ name }"`
				}
				attrs += ` ${ name }: "${ attr.value }",`
			}
			if (attrs != "") {
				attrs = `, {${ attrs }}`
			}
			let contents = el.hasChildNodes() ? recursiveMakeVNode(el) : ""
			if (contents != "") {
				contents = `, ${ contents }`
			}
			lines.push(`m("${ el.nodeName.toLowerCase() }"${ attrs }${ contents })`)
		} else if (el instanceof Text) {
			if (el.textContent?.trim() != "") {
				lines.push(JSON.stringify(el.textContent))
			}
		} else {
			console.log("Unhandled element type", el)
		}
	}

	if (lines.length === 1) {
		return lines[0]
	} else {
		return `[\n\t${ lines.join(",\n\t") }\n]`
	}
}
