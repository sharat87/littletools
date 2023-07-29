import m from "mithril"
import { Appearance } from "./enumTypes"

type ButtonAttrs = {
	type?: "button" | "submit"
	onclick?: (event: MouseEvent) => void
	class?: string
	style?: Record<string, string>
	onmousedown?: (event: MouseEvent) => void
	appearance?: Appearance
	size?: "sm" | "m" | "lg"
	tooltip?: string
	disabled?: boolean
	isLoading?: boolean
	form?: string
	name?: string
	value?: string
}

export class Button {
	view(vnode: m.Vnode<ButtonAttrs>) {
		const content: m.ChildArray = []

		if (!(vnode.children instanceof Array) || vnode.children.length > 0) {
			content.push(m(
				".hstack.gap-1.pe-none",
				{
					style: {
						opacity: vnode.attrs.isLoading ? ".4" : "1",
					},
				},
				vnode.children,
			))
		}

		if (vnode.attrs.isLoading) {
			content.push(m(".hstack.justify-content-center.position-absolute.top-0.start-0.w-100.h-100", m(".spinner-border.spinner-border-sm")))
		}

		return m("button.btn.position-relative", {
			type: vnode.attrs.type ?? (vnode.attrs.onclick == null ? null : "button"),
			onclick: vnode.attrs.disabled ? undefined : vnode.attrs.onclick,
			class: (vnode.attrs.class ?? "") +
				(vnode.attrs.appearance == null ? "" : " btn-" + vnode.attrs.appearance) +
				(vnode.attrs.size == null ? "" : " btn-" + vnode.attrs.size),
			style: vnode.attrs.style,
			disabled: vnode.attrs.isLoading === true ? true : vnode.attrs.disabled,
			tooltip: vnode.attrs.tooltip,
			form: vnode.attrs.form,
			name: vnode.attrs.name,
			value: vnode.attrs.value,
			onmousedown: vnode.attrs.disabled ? undefined : vnode.attrs.onmousedown,
		}, content)
	}
}
