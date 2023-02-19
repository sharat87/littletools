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
}

export class Button {
	view(vnode: m.Vnode<ButtonAttrs>) {
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
			onmousedown: vnode.attrs.disabled ? undefined : vnode.attrs.onmousedown,
		}, [
			m(".hstack.gap-1.pe-none", { class: vnode.attrs.isLoading ? "invisible" : undefined }, vnode.children),
			vnode.attrs.isLoading && m(".hstack.justify-content-center.position-absolute.top-0.start-0.w-100.h-100", m(".spinner-border.spinner-border-sm")),
		])
	}
}
