import m from "mithril"
import Stream from "mithril/stream"
import { copyToClipboard, showGhost } from "./utils"

interface InputAttrs {
	id?: string
	class?: string
	type?: "text" | "checkbox" | "radio" | "range"
	disabled?: boolean
	placeholder?: string
	autofocus?: boolean
	pattern?: string
	minlength?: number
	maxlength?: number
	list?: string
	model?: Stream<string | boolean>
	value?: string | number | boolean
	min?: number  // For range inputs only
	onChange?: (value: string | boolean) => void
	onkeydown?: (event: KeyboardEvent) => void
	onkeyup?: (event: KeyboardEvent) => void
}

export class Input implements m.ClassComponent<InputAttrs> {
	oncreate(vnode: m.VnodeDOM<InputAttrs>): any {
		if (vnode.attrs.autofocus) {
			(vnode.dom as HTMLInputElement).focus()
		}
	}

	view(vnode: m.Vnode<InputAttrs>): m.Children {
		let valueAttrs: Record<string, unknown>

		if (vnode.attrs.type === "checkbox" || vnode.attrs.type === "radio") {
			valueAttrs = {
				checked: vnode.attrs.model == null ? (vnode.attrs.value ?? false) : vnode.attrs.model(),
			}
		} else if (vnode.attrs.type === "range") {
			valueAttrs = {
				valueAsNumber: vnode.attrs.model == null ? (vnode.attrs.value ?? 50) : vnode.attrs.model(),
			}
		} else {
			valueAttrs = {
				value: vnode.attrs.model == null ? (vnode.attrs.value ?? "") : vnode.attrs.model(),
			}
		}

		return m((vnode.attrs.type === "checkbox" ? "input.form-check-input" : "input.form-control") + (vnode.attrs.disabled ? ".disabled" : ""), {
			id: vnode.attrs.id,
			class: vnode.attrs.class,
			type: vnode.attrs.type,
			disabled: vnode.attrs.disabled,
			placeholder: vnode.attrs.placeholder,
			autofocus: vnode.attrs.autofocus,
			pattern: vnode.attrs.pattern,
			minlength: vnode.attrs.minlength,
			maxlength: vnode.attrs.maxlength,
			list: vnode.attrs.list,
			min: vnode.attrs.min,
			...valueAttrs,
			oninput: (event: InputEvent) => {
				const target = event.target as HTMLInputElement
				if (vnode.attrs.model != null) {
					vnode.attrs.model(vnode.attrs.type === "checkbox" ? target.checked : target.value)
				} else if (vnode.attrs.onChange != null) {
					vnode.attrs.onChange(vnode.attrs.type === "checkbox" ? target.checked : target.value)
				}
			},
			onkeydown: vnode.attrs.onkeydown,
			onkeyup: vnode.attrs.onkeyup,
		})
	}
}

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

interface TextareaAttrs {
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

interface SelectAttrs {
	class?: string
	options: Record<string, string>
	model: Stream<string>
}

export class Select {
	view(vnode: m.Vnode<SelectAttrs>) {
		return m(
			"select.form-select",
			{
				class: vnode.attrs.class,
				value: vnode.attrs.model(),
				onchange: (event: Event) => {
					vnode.attrs.model((event.target as HTMLSelectElement).value)
				},
			},
			Object.entries(vnode.attrs.options).map((item) => m("option", { value: item[0] }, item[1])),
		)
	}
}

type Color = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark"
type Appearance = Color | `outline-${ Color }`

interface ButtonAttrs {
	type?: "button" | "submit"
	onclick?: (event: MouseEvent) => void
	class?: string
	style?: Record<string, string>
	onmousedown?: (event: MouseEvent) => void
	appearance?: Appearance
	size?: "sm" | "lg"
}

export class Button {
	view(vnode: m.Vnode<ButtonAttrs>) {
		return m("button.btn", {
			type: vnode.attrs.type ?? (vnode.attrs.onclick == null ? null : "button"),
			onclick: vnode.attrs.onclick,
			class: (vnode.attrs.class ?? "") +
				(vnode.attrs.appearance == null ? "" : " btn-" + vnode.attrs.appearance) +
				(vnode.attrs.size == null ? "" : " btn-" + vnode.attrs.size),
			style: vnode.attrs.style,
			onmousedown: vnode.attrs.onmousedown,
		}, vnode.children)
	}
}

interface CopyButtonAttrs {
	content: unknown
	class?: string
	appearance?: Appearance
	size?: "sm" | "lg"
}

export class CopyButton {
	view(vnode: m.Vnode<CopyButtonAttrs>) {
		let children: m.Children = vnode.children
		if (children == null || (children as Array<unknown>).length === 0) {
			children = "Copy"
		}
		return m(Button, {
			class: vnode.attrs.class,
			size: vnode.attrs.size,
			appearance: vnode.attrs.appearance,
			onclick(event: MouseEvent) {
				copyToClipboard(String(
					// It's usually a function, when it's a Stream.
					typeof vnode.attrs.content === "function" ? vnode.attrs.content() : vnode.attrs.content,
				))
				showGhost(event.target as HTMLButtonElement)
			},
		}, children)
	}
}

interface PopoverButtonAttrs {
	popoverView: () => m.Children
}

export class PopoverButton implements m.ClassComponent<PopoverButtonAttrs> {
	private openTarget: null | HTMLButtonElement = null

	view(vnode: m.Vnode<PopoverButtonAttrs>) {
		return [
			m(Button, {
				appearance: "outline-primary",
				class: this.openTarget == null ? undefined : "active",
				onclick: (event: MouseEvent) => {
					event.preventDefault()
					this.openTarget = this.openTarget == null ? event.target as HTMLButtonElement : null
				},
			}, vnode.children),
			this.openTarget != null && m(
				".popover.bs-popover-auto.d-flex.fade.show",
				{
					style: this.computePositionStyles(),
				},
				vnode.attrs.popoverView(),
			),
		]
	}

	computePositionStyles(): Record<string, string> {
		if (this.openTarget == null) {
			return {}
		}

		const targetBounds = this.openTarget.getBoundingClientRect()

		return {
			width: "340px", // TODO: This should be computed from the popover content.
			position: "absolute",
			left: (targetBounds.left + targetBounds.right) / 2 + "px",
			transform: "translateX(-50%)",
			top: targetBounds.bottom + "px",
			maxHeight: "calc(99vh - " + (targetBounds.bottom + targetBounds.top) + "px)",
		}
	}
}

interface CodeBlockAttrs {
	class?: string
}

export class CodeBlock implements m.ClassComponent<CodeBlockAttrs> {
	view(vnode: m.Vnode<CodeBlockAttrs>) {
		return m(".hstack.align-items-start.my-2", { class: vnode.attrs.class }, [
			m(CopyButton, {
				appearance: "outline-secondary",
				size: "sm",
				content: vnode.children,
			}),
			m("pre.mb-0.ms-2.flex-grow-1", vnode.children),
		])
	}
}

interface NotebookAttrs {
	class?: string
	tabs: Record<string, (() => m.Children)>
}

export class Notebook implements m.ClassComponent<NotebookAttrs> {
	currentTab: null | string

	constructor() {
		this.currentTab = null
	}

	view(vnode: m.Vnode<NotebookAttrs>): m.Children {
		const { tabs } = vnode.attrs

		if (this.currentTab == null || tabs[this.currentTab] == null) {
			this.currentTab = Object.keys(tabs)[0]
		}

		return m(".d-flex.flex-column", { class: vnode.attrs.class }, [
			m("ul.nav.nav-tabs", Object.keys(tabs).map(
				(key) => m("li.nav-item", m("a.nav-link", {
					href: "#",
					class: this.currentTab === key ? "active" : undefined,
					onclick: (event: MouseEvent) => {
						event.preventDefault()
						this.currentTab = key
					},
				}, key)),
			)),
			m(
				".mb-3.p-3.border-start.border-end.border-bottom.flex-grow-1.vstack.gap-2",
				this.currentTab != null && tabs[this.currentTab](),
			),
		])
	}
}
