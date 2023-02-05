import m from "mithril"
import type { InputAttrs } from "./Input"
import { Input } from "./Input"

export class Checkbox extends Input {
	view(vnode: m.Vnode<InputAttrs>): m.Children {
		return m(".d-inline-block", [
			m(Input, {
				...vnode.attrs,
				type: "checkbox",
			}),
			m("label.ms-1.cursor-pointer", {
				class: vnode.attrs.disabled ? "text-muted" : undefined,
				for: vnode.attrs.id,
			}, vnode.children),
		])
	}
}
