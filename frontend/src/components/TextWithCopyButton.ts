import m from "mithril"
import { Icon } from "~src/components/Icon"
import { copyToClipboard } from "~src/utils"

interface Attrs {
	text: string
	wrapper?: string
}

export class TextWithCopyButton implements m.ClassComponent<Attrs> {
	private startX: number = 0
	private startY: number = 0

	view(vnode: m.Vnode<Attrs>): m.Children {
		return m(
			".copyable-text",
			{
				onmousedown: (event: MouseEvent) => {
					this.startX = event.screenX
					this.startY = event.screenY
				},
				onmouseup: (event: MouseEvent) => {
					if (Math.abs(event.screenX - this.startX) < 9 && Math.abs(event.screenY - this.startY) < 9) {
						copyToClipboard(vnode.attrs.text, event.target as HTMLButtonElement)
					}
				},
			},
			[
				m(Icon, "content_copy"),
				m(vnode.attrs.wrapper ?? "span", vnode.attrs.text),
			],
		)
	}
}
