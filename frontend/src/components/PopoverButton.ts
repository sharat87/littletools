import m from "mithril"
import { Appearance } from "./enumTypes"
import { Button } from "./Button"

type PopoverButtonAttrs = {
	appearance?: Appearance
	popoverView: () => m.Children
	width?: number
}

// TODO: Figure out a way that only one popover is open at any time.
export class PopoverButton implements m.ClassComponent<PopoverButtonAttrs> {
	private openTarget: null | HTMLButtonElement = null

	view(vnode: m.Vnode<PopoverButtonAttrs>) {
		return [
			m(Button, {
				appearance: vnode.attrs.appearance,
				class: this.openTarget == null ? undefined : "active",
				onclick: (event: MouseEvent) => {
					event.preventDefault()
					this.openTarget = this.openTarget == null ? event.target as HTMLButtonElement : null
				},
			}, vnode.children),
			this.openTarget != null && m(
				".popover.bs-popover-auto.d-flex.fade.show",
				{
					style: this.computePositionStyles(vnode),
				},
				vnode.attrs.popoverView(),
			),
		]
	}

	computePositionStyles(vnode: m.Vnode<PopoverButtonAttrs>): Record<string, string> {
		if (this.openTarget == null) {
			return {}
		}

		const targetBounds = this.openTarget.getBoundingClientRect()

		let more: Record<string, string>

		if (targetBounds.right + 100 > window.innerWidth) {
			more = {
				right: (window.innerWidth - targetBounds.right) + "px",
			}
		} else {
			more = {
				left: targetBounds.left + "px",
				transform: "translateX(-100%)",
			}
		}

		console.log("more", more, this.openTarget)
		return {
			width: (vnode.attrs.width ?? 340) + "px", // TODO: This should be computed from the popover content.
			position: "absolute",
			top: (targetBounds.bottom + 3) + "px",
			maxHeight: "calc(99vh - " + (targetBounds.bottom + targetBounds.top) + "px)",
			...more,
		}
	}
}
