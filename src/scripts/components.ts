import m from "mithril"
import type Stream from "mithril/stream"

interface TextareaAttrs {
	rows?: number
	placeholder?: string
	autofocus?: boolean
	model: Stream<string>
}

export class Textarea {
	view(vnode: m.Vnode<TextareaAttrs>) {
		return m("textarea", {
			rows: vnode.attrs.rows ?? 4,
			placeholder: vnode.attrs.placeholder,
			autofocus: vnode.attrs.autofocus,
			value: vnode.attrs.model(),
			oninput(event: InputEvent) {
				vnode.attrs.model((event.target as HTMLInputElement).value)
			},
		})
	}
}
