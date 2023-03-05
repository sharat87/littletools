import Stream from "mithril/stream"
import m from "mithril"

export type InputAttrs = {
	autocomplete?: undefined | "off"
	autofocus?: boolean
	class?: string
	disabled?: boolean
	id?: string
	list?: string
	maxlength?: number
	min?: number  // For range inputs only
	minlength?: number
	model?: Stream<string | boolean>
	name?: string
	onChange?: (value: string | boolean) => void
	onkeydown?: (event: KeyboardEvent) => void
	onkeyup?: (event: KeyboardEvent) => void
	pattern?: string
	placeholder?: string
	required?: boolean
	style?: Record<string, string>
	type?: "text" | "checkbox" | "radio" | "range" | "password" | "file" | "number" | "hidden"
	value?: string | number | boolean
}

export class Input implements m.ClassComponent<InputAttrs> {
	oncreate(vnode: m.VnodeDOM<InputAttrs>): any {
		if (vnode.attrs.autofocus) {
			(vnode.dom as HTMLInputElement).focus()
		}
	}

	view(vnode: m.Vnode<InputAttrs>): m.Children {
		let valueAttrs: Record<string, unknown>
		const isCheck = vnode.attrs.type === "checkbox"
		const isRadio = vnode.attrs.type === "radio"
		const isCheckLike = isCheck || isRadio

		if (isCheck) {
			valueAttrs = {
				checked: vnode.attrs.model == null ? (vnode.attrs.value ?? false) : vnode.attrs.model(),
			}

		} else if (isRadio) {
			if (vnode.attrs.model == null) {
				throw new Error("Radio inputs require a model")
			}
			valueAttrs = {
				value: vnode.attrs.value,
				checked: vnode.attrs.model() === vnode.attrs.value,
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

		return m((isCheckLike ? "input.form-check-input" : "input.form-control") + (vnode.attrs.disabled ? ".disabled" : ""), {
			autocomplete: vnode.attrs.autocomplete,
			autofocus: vnode.attrs.autofocus,
			class: vnode.attrs.class,
			disabled: vnode.attrs.disabled,
			id: vnode.attrs.id,
			list: vnode.attrs.list,
			maxlength: vnode.attrs.maxlength,
			min: vnode.attrs.min,
			minlength: vnode.attrs.minlength,
			name: vnode.attrs.name,
			pattern: vnode.attrs.pattern,
			placeholder: vnode.attrs.placeholder,
			required: vnode.attrs.required,
			style: vnode.attrs.style,
			type: vnode.attrs.type,
			...valueAttrs,
			oninput: (event: InputEvent) => {
				const target = event.target as HTMLInputElement
				if (vnode.attrs.model != null) {
					if (isRadio) {
						// For radio buttons, we set the value, to the model, only if we are checked.
						if (target.checked) {
							console.log("setting to model", target, target.value)
							vnode.attrs.model(target.value)
						}
					} else {
						vnode.attrs.model(isCheck ? target.checked : target.value)
					}
				} else if (vnode.attrs.onChange != null) {
					if (isRadio) {
						// For radio buttons, we call with the value, only if we are checked.
						if (target.checked) {
							vnode.attrs.onChange(target.value)
						}
					} else {
						vnode.attrs.onChange(isCheck ? target.checked : target.value)
					}
				}
			},
			onkeydown: vnode.attrs.onkeydown,
			onkeyup: vnode.attrs.onkeyup,
		})
	}
}
