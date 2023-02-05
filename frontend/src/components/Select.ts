import Stream from "mithril/stream"
import m from "mithril"

type SelectAttrs = {
	class?: string
	options: Record<string, string>
	model: Stream<string>
}

export class Select {
	view(vnode: m.Vnode<SelectAttrs>) {
		return m(
			"select.form-select.w-auto",
			{
				class: vnode.attrs.class,
				value: vnode.attrs.model?.(),
				onchange: (event: Event) => {
					vnode.attrs.model((event.target as HTMLSelectElement).value)
				},
			},
			vnode.attrs.options != null && Object.entries(vnode.attrs.options).map((item) => m("option", { value: item[0] }, item[1])),
		)
	}
}
