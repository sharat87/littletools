import m from "mithril"
import { preventDefaultHandler } from "~src/utils"
import Stream from "mithril/stream"
import { Input } from "~src/components/Input"

interface FormAttrs {
	id: string
	class?: string
	target?: string
	fields: (undefined | null | boolean | FieldSpec)[]
	buttons?: () => m.Children
	method?: "GET" | "POST"
	action?: string
	onsubmit?: (event: SubmitEvent) => void
}

class FieldSpec {
	subTextValue: undefined | m.Children | (() => m.Children) = undefined

	constructor(public label: string, public view: () => m.Children) {
	}

	subText(content: m.Children | (() => m.Children)): this {
		this.subTextValue = content
		return this
	}
}

export class Form implements m.ClassComponent<FormAttrs> {
	private mutationObserver: MutationObserver | null = null

	static field(label: string, view: () => m.Children): FieldSpec {
		return new FieldSpec(label, view)
	}

	static radioField(label: string, model: Stream<string>, options: Record<string, string>): FieldSpec {
		return new FieldSpec(label, () => m(".vstack.gap-1.py-2", Object.entries(options).map(
			([value, title]) => m("label", [
				m(Input, {
					type: "radio",
					name: label,
					value,
					model,
				}),
				m("span.ms-1", title),
			])
		)))
	}

	oncreate(vnode: m.VnodeDOM<FormAttrs>): void {
		this.prepareForm(vnode)
		this.mutationObserver = new MutationObserver(() => this.prepareForm(vnode))
		this.mutationObserver.observe(vnode.dom, { childList: true, subtree: true })
	}

	onbeforeremove(vnode: m.VnodeDOM<FormAttrs, this>): Promise<any> | void {
		this.mutationObserver?.disconnect()
	}

	prepareForm(vnode: m.VnodeDOM<FormAttrs>): void {
		// Set the "for" attribute of the label to the ID of the input.
		for (const label of vnode.dom.querySelectorAll("label.auto-id")) {
			const input = label.nextElementSibling?.querySelector("input, textarea, select") satisfies (HTMLInputElement | null | undefined)
			if (input?.labels?.length === 0) {
				(label as HTMLLabelElement).htmlFor = input.id =
					vnode.attrs.id + "-" + label.textContent!.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")
			}
		}

		// Update form type if there are file inputs.
		(vnode.dom as HTMLFormElement).enctype =
			vnode.dom.querySelector("input[type=file]") ? "multipart/form-data" : ""
	}

	view(vnode: m.Vnode<FormAttrs>): m.Children {
		const children: m.Children[] = []

		for (const spec of vnode.attrs.fields) {
			if (spec == null || spec === true || spec === false) {
				continue
			}
			children.push(
				m("label.auto-id.p-2.pe-0.text-end.text-nowrap", [spec.label, ":"]),
				m(
					".px-1.align-self-center",
					{
						style: {
							maxWidth: "480px",
						},
					},
					[
						spec.view(),
						spec.subTextValue && m(
							".form-text.text-secondary",
							typeof spec.subTextValue === "function" ? spec.subTextValue() : spec.subTextValue,
						),
					],
				),
			)
		}

		let onsubmit = vnode.attrs.onsubmit
		if (vnode.attrs.action == null && vnode.attrs.onsubmit == null) {
			onsubmit = preventDefaultHandler
		}

		return m("form.grid", {
			id: vnode.attrs.id,
			class: vnode.attrs.class,
			method: vnode.attrs.method ?? "POST",
			action: vnode.attrs.action,
			onsubmit,
		}, [
			children,
			vnode.attrs.buttons && m(".hstack.gap-2.p-1.my-2", {
				style: {
					"grid-column": "2",
				}
			}, vnode.attrs.buttons()),
		])
	}
}
