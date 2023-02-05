import m from "mithril"
import { CopyButton } from "./CopyButton"


type CodeBlockAttrs = {
	class?: string
}

export class CodeBlock implements m.ClassComponent<CodeBlockAttrs> {
	view(vnode: m.Vnode<CodeBlockAttrs>) {
		return m(".position-relative.border", { class: vnode.attrs.class }, [
			m("pre.h-100", vnode.children),
			m(CopyButton, {
				class: "position-absolute top-0 shadow-sm hover-fade",
				style: {
					right: "12px",
				},
				appearance: "secondary",
				size: "sm",
				content: vnode.children,
			}),
		])
	}
}
