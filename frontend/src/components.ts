import m from "mithril"
import Stream from "mithril/stream"
import { copyToClipboard, showGhost } from "./utils"
import Bus from "~src/bus"

export const ToolContainer = ".container-fluid.h-100.overflow-auto.vstack.gap-2.pb-2"

export abstract class ToolView implements m.ClassComponent {
	static title = "Tool"
	static acceptsDroppedFiles = false

	#isDragging = false

	protected constructor() {
		this.ondragover = this.ondragover.bind(this)
		this.ondragleave = this.ondragleave.bind(this)
		this.ondrop = this.ondrop.bind(this)
	}

	oncreate(vnode: m.VnodeDOM): void {
		const file = Bus.getFileFromBucket()
		if (file != null) {
			this.openFile(file)
		}
	}

	view(vnode: m.Vnode): m.Children {
		const attrs: Record<string, unknown> = {}

		if ((this.constructor as { acceptsDroppedFiles?: boolean }).acceptsDroppedFiles) {
			attrs.ondragover = this.ondragover
			attrs.ondragleave = this.ondragleave
			attrs.ondrop = this.ondrop
		}

		return m(ToolContainer, attrs, [
			m(".hstack", [
				m("h1.flex-grow-1", (this.constructor as { title?: string }).title),
				this.headerEndView(),
			]),
			this.mainView(),
			this.#isDragging && [
				m(".modal.d-block.pe-none", m(".modal-dialog", m(".modal-content", m(".modal-header", m("h5.modal-title", "Drop image to compute Base64"))))),
				m(".modal-backdrop.fade.show", { style: { left: "auto" } }),
			],
		])
	}

	headerEndView(): m.Children {
		return null
	}

	abstract mainView(): m.Children

	openFile(file: File): void {
		throw new Error("Opening dropped files is not implemented!")
	}

	ondragover(event: DragEvent): void {
		this.#isDragging = true
		event.preventDefault()
	}

	ondragleave() {
		this.#isDragging = false
	}

	ondrop(event: DragEvent) {
		this.#isDragging = false
		event.preventDefault()

		if (event.dataTransfer?.items) {
			for (const item of event.dataTransfer.items) {
				if (item.kind === "file") {
					const file = item.getAsFile()
					if (file != null) {
						this.openFile(file)
					}
					// TODO: Dropping multiple files to encode as base64
					break
				}
			}

		} else {
			// Use DataTransfer interface to access the file(s)
			// New interface handling: vnode.state.files = event.dataTransfer.files

		}
		m.redraw()
	}
}

type InputAttrs = {
	id?: string
	name?: string
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
				value: vnode.attrs.model == null
					? (vnode.attrs.value == null ? undefined : (vnode.attrs.value ?? ""))
					: vnode.attrs.model(),
			}
		}

		return m((vnode.attrs.type === "checkbox" ? "input.form-check-input" : "input.form-control") + (vnode.attrs.disabled ? ".disabled" : ""), {
			id: vnode.attrs.id,
			name: vnode.attrs.name,
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

type SelectAttrs = {
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

type ButtonAttrs = {
	type?: "button" | "submit"
	onclick?: (event: MouseEvent) => void
	class?: string
	style?: Record<string, string>
	onmousedown?: (event: MouseEvent) => void
	appearance?: Appearance
	size?: "sm" | "lg"
	tooltip?: string
	disabled?: boolean
	isLoading?: boolean
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
			onmousedown: vnode.attrs.disabled ? undefined : vnode.attrs.onmousedown,
		}, [
			m(".hstack.gap-1", { class: vnode.attrs.isLoading ? "invisible" : undefined }, vnode.children),
			vnode.attrs.isLoading && m(".hstack.justify-content-center.position-absolute.top-0.start-0.w-100.h-100", m(".spinner-border.spinner-border-sm")),
		])
	}
}

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
				left: (targetBounds.left + targetBounds.right) / 2 + "px",
				transform: "translateX(-50%)",
			}
		}

		return {
			width: (vnode.attrs.width ?? 340) + "px", // TODO: This should be computed from the popover content.
			position: "absolute",
			top: (targetBounds.bottom + 3) + "px",
			maxHeight: "calc(99vh - " + (targetBounds.bottom + targetBounds.top) + "px)",
			...more,
		}
	}
}

type CodeBlockAttrs = {
	class?: string
}

export class CodeBlock implements m.ClassComponent<CodeBlockAttrs> {
	view(vnode: m.Vnode<CodeBlockAttrs>) {
		return m(".position-relative", { class: vnode.attrs.class }, [
			m("pre.h-100", vnode.children),
			m(CopyButton, {
				class: "position-absolute top-0 shadow-sm",
				style: {
					right: "12px",
				},
				appearance: "secondary",
				size: "sm",
				content: vnode.children,
			}),
		])
	}
}

type NotebookAttrs = {
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

		return m(".vstack", { class: vnode.attrs.class }, [
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
				".p-2.border-start.border-end.border-bottom.flex-grow-1.vstack.gap-2.min-h-0",
				this.currentTab != null && tabs[this.currentTab](),
			),
		])
	}
}

type IconAttrs = {
	tooltip?: string
}

// Icons Ref: <https://fonts.google.com/icons>.
export class Icon implements m.ClassComponent<IconAttrs> {
	view(vnode: m.Vnode<IconAttrs>) {
		return m(".material-symbols-outlined", vnode.attrs, vnode.children)
	}
}
