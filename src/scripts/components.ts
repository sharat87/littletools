import m from "mithril"
import Stream from "mithril/stream"
import { copyToClipboard, showGhost } from "./utils"

interface InputAttrs {
	id?: string
	class?: string
	placeholder?: string
	autofocus?: boolean
	pattern?: string
	minlength?: number
	maxlength?: number
	model?: Stream<string>
	value?: string
	oninput?: (value: string) => void
}

export class Input implements m.ClassComponent<InputAttrs> {
	view(vnode: m.Vnode<InputAttrs>) {
		// console.log("one", vnode.attrs.model())
		return m("input.form-control", {
			id: vnode.attrs.id,
			class: vnode.attrs.class,
			placeholder: vnode.attrs.placeholder,
			autofocus: vnode.attrs.autofocus,
			pattern: vnode.attrs.pattern,
			minlength: vnode.attrs.minlength,
			maxlength: vnode.attrs.maxlength,
			value: vnode.attrs.model == null ? vnode.attrs.value : vnode.attrs.model(),
			oninput: (event: InputEvent) => {
				if (vnode.attrs.model != null) {
					vnode.attrs.model((event.target as HTMLInputElement).value)
				} else if (vnode.attrs.oninput != null) {
					vnode.attrs.oninput((event.target as HTMLInputElement).value)
				}
			},
		})
	}
}

interface TextareaAttrs {
	class?: string
	rows?: number
	placeholder?: string
	autofocus?: boolean
	value?: string
	model?: Stream<string>
	onChange?: (value: string) => void
	onkeydown?: (event: KeyboardEvent) => void
}

export class Textarea {
	view(vnode: m.Vnode<TextareaAttrs>) {
		return m("textarea.form-control", {
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

interface ButtonAttrs {
	type?: "button" | "submit"
	onclick?: (event: MouseEvent) => void
}

export class Button {
	view(vnode: m.Vnode<ButtonAttrs>) {
		return m("button.btn.btn-primary", {
			type: vnode.attrs.type ?? (vnode.attrs.onclick == null ? null : "button"),
			onclick: vnode.attrs.onclick,
		}, vnode.children)
	}
}

interface CopyButtonAttrs {
	content: unknown
}

export class CopyButton {
	view(vnode: m.Vnode<CopyButtonAttrs>) {
		let children = vnode.children
		if (children == null || (children as Array<unknown>).length === 0) {
			children = "Copy"
		}
		return m(Button, {
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

interface NotebookAttrs {
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

		return m(".notebook", [
			m(".tabs", Object.keys(tabs).map(
				(key) => m("button", {
					class: this.currentTab === key ? "active" : undefined,
					onclick: () => {
						this.currentTab = key
					},
				}, key),
			)),
			this.currentTab != null && tabs[this.currentTab](),
		])
	}
}
