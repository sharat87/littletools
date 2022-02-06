import m from "mithril"
import type Stream from "mithril/stream"
import { copyToClipboard, showGhost } from "./utils"

interface InputAttrs {
	class?: string
	placeholder?: string
	autofocus?: boolean
	model: Stream<string>
}

export class Input {
	view(vnode: m.Vnode<InputAttrs>) {
		return m("input", {
			class: vnode.attrs.class,
			placeholder: vnode.attrs.placeholder,
			autofocus: vnode.attrs.autofocus,
			value: vnode.attrs.model(),
			oninput(event: InputEvent) {
				vnode.attrs.model((event.target as HTMLInputElement).value)
			},
		})
	}
}

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

interface ButtonAttrs {
	type?: "button" | "submit"
	onclick?: (event: MouseEvent) => void
}

export class Button {
	view(vnode: m.Vnode<ButtonAttrs>) {
		return m("button", {
			type: vnode.attrs.type ?? (vnode.attrs.onclick == null ? null : "button"),
			onclick: vnode.attrs.onclick,
		}, vnode.children)
	}
}

interface CopyButtonAttrs {
	content: string | (() => string)
}

export class CopyButton {
	view(vnode: m.Vnode<CopyButtonAttrs>) {
		return m(Button, {
			onclick(event: MouseEvent) {
				copyToClipboard(typeof vnode.attrs.content === "string" ? vnode.attrs.content : vnode.attrs.content())
				showGhost(event.target as HTMLButtonElement)
			},
		}, vnode.children)
	}
}
