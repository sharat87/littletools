import m from "mithril"

type Spec = {
	title: string
	body: m.Vnode
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
		timerId = setInterval(() => {
			m.redraw()
			if (toasts.length === 0) {
				clearInterval(timerId)
				timerId = 0
			}
		}, 1000)
	}
}

export class View implements m.ClassComponent {

	view() {
		return m(".toast-container.position-fixed.top-0.end-0.p-3", toasts.map(
			({ id, time, title, body }) => m(".toast.toast-top-right.show.text-bg-primary.border-0", [
				m(".toast-header.text-bg-primary", [
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
