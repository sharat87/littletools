import m from "mithril"
import { copyToClipboard, showGhost } from "../utils"
import { Button } from "./Button"
import { Icon } from "./Icon"
import { Appearance } from "./enumTypes"

type CopyButtonAttrs = {
	content: unknown
	class?: string
	style?: Record<string, string>
	appearance?: Appearance
	size?: "sm" | "lg"
	tooltip?: string
	disabled?: boolean
}

export class CopyButton {
	view(vnode: m.Vnode<CopyButtonAttrs>) {
		let children: m.Children = vnode.children
		return m(Button, {
			class: vnode.attrs.class,
			style: vnode.attrs.style,
			size: vnode.attrs.size ?? "sm",
			appearance: vnode.attrs.appearance ?? "outline-secondary",
			tooltip: vnode.attrs.tooltip,
			disabled: vnode.attrs.disabled,
			async onclick(event: MouseEvent) {
				let value: string | Blob | Promise<string | Blob>
				if (typeof vnode.attrs.content === "function") {
					// It's usually a function when it's a Stream.
					value = vnode.attrs.content()
					if (value instanceof Promise) {
						value = await value
					}
				} else {
					value = String(vnode.attrs.content)
				}
				copyToClipboard(value)
				showGhost(event.target as HTMLButtonElement)
			},
		}, [m(Icon, "content_copy"), children])
	}
}
