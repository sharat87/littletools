import m from "mithril"

type Spec = {
	title: string
	body: m.Children
	appearance?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark"
}

type SpecEntry = Spec & {
	id: number
	time: number
}

let nextId = 1
const toasts: SpecEntry[] = []
let timerId = 0

const rtf = new (Intl as any).RelativeTimeFormat("en", {
	localeMatcher: "best fit",
	numeric: "auto",
	style: "long",
})

export function push(spec: Spec): void {
	toasts.push({
		...spec,
		id: nextId++,
		time: Math.round(Date.now() / 1000),
	})
	if (timerId === 0) {
		timerId = setInterval(timerTick, 1000)
	}
	m.redraw()
}

export function error(body: string, title: string = body): void {
	push({ title, body, appearance: "danger" })
}

function timerTick() {
	m.redraw()
	for (let i = 0; i < toasts.length; ++i) {
		const toast = toasts[i]
		const diff = Math.round(Date.now() / 1000) - toast.time
		if (diff > 10) {
			toasts.splice(i, 1)
			i--
		}
	}
	if (toasts.length === 0) {
		clearInterval(timerId)
		timerId = 0
	}
}

export class View implements m.ClassComponent {

	view() {
		return m(".toast-container.position-fixed.top-0.end-0.p-3", toasts.map(
			({ id, time, title, body, appearance }) => {
				const ageSeconds = Math.round(Date.now() / 1000) - time
				const closeBtn = m("button.btn-close", {
					class: appearance && ["primary", "success", "danger"].includes(appearance) ? "btn-close-white" : "",
					onclick: () => {
						toasts.splice(toasts.findIndex((t) => t.id === id), 1)
					},
				})
				return m(".toast.toast-top-right.show", {
					class: appearance && "text-bg-" + appearance,
				}, [
					title && m(".toast-header.d-flex.justify-content-between.fw-bold", {
						class: appearance && "text-bg-" + appearance,
					}, [
						title,
						closeBtn,
					]),
					m(".toast-body.d-flex.justify-content-between", [
						body,
						!title && closeBtn,
					]),
					ageSeconds > 30 && m(".small.text-right", {
						style: {
							padding: ".25rem var(--bs-toast-padding-x)",
							"border-top": "1px solid var(--bs-toast-header-border-color)",
						}
					}, rtf.format(-ageSeconds, "second")),
				])
			},
		))
	}

}
