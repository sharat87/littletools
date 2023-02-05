import Stream from "mithril/stream"
import m from "mithril"

type TextareaAttrs = {
	id?: string
	class?: string
	rows?: number
	placeholder?: string
	autofocus?: boolean
	value?: string
	model?: Stream<string>
	onChange?: (value: string) => void
	onkeydown?: (event: KeyboardEvent) => void
	onfocus?: (event: FocusEvent) => void
}

export class Textarea {
	view(vnode: m.Vnode<TextareaAttrs>) {
		return m("textarea.form-control", {
			id: vnode.attrs.id,
			class: vnode.attrs.class,
			rows: vnode.attrs.rows ?? 4,
			placeholder: vnode.attrs.placeholder,
			autofocus: vnode.attrs.autofocus,
			value: vnode.attrs.model == null ? vnode.attrs.value : vnode.attrs.model(),
			oninput(event: InputEvent) {
				if (vnode.attrs.model != null) {
					vnode.attrs.model((event.target as HTMLInputElement).value)
				} else if (vnode.attrs.onChange != null) {
					vnode.attrs.onChange((event.target as HTMLInputElement).value)
				}
			},
			onkeydown: vnode.attrs.onkeydown,
			onfocus: vnode.attrs.onfocus,
		})
	}
}
