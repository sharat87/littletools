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
}

function timerTick() {
	m.redraw()
	for (let i = 0; i < toasts.length; ++i) {
		const toast = toasts[i]
		const diff = Math.round(Date.now() / 1000) - toast.time
		if (diff > 6) {
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
			({ id, time, title, body, appearance }) => m(".toast.toast-top-right.show.border-0", {
				class: appearance && "text-bg-" + appearance,
			}, [
				m(".toast-header", {
					class: appearance && "text-bg-" + appearance,
				}, [
					m(".me-auto.fw-bold", title),
					m("small", rtf.format(time - Math.round(Date.now() / 1000), "second")),
					m("button.btn-close.btn-close-white", {
						onclick: () => {
							toasts.splice(toasts.findIndex((t) => t.id === id), 1)
						},
					}),
				]),
				m(".toast-body", body),
			]),
		))
	}

}
