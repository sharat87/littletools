import m from "mithril"
import Stream from "mithril/stream"
import { Button, Input, ToolView } from "../components"
import { padLeft } from "../utils"

// TODO: A message like "Timer finished 5mins ago".
// TODO: A beep sound when the timer finishes.
// TODO: A notification when the timer finishes.
// TODO: Show the new timer input, if the current timer is finished.
// TODO: Show example inputs.

export default class extends ToolView {
	static title = "Timer / Pomodoro"

	private readonly input = Stream("20mins")
	private timerEnd: null | number = null
	private totalTimerMillis: null | number = null
	private intervalId: null | number = null

	constructor() {
		super()
		this.tick = this.tick.bind(this)
	}

	onremove() {
		this.clearInterval()
	}

	mainView(): m.Children {
		return [
			this.timerEnd == null
				? [
					m("form.vstack.gap-3", {
						onsubmit: (event: SubmitEvent) => {
							event.preventDefault()
							this.startTimer()
						},
					}, [
						m(Input, {
							class: "fs-3",
							model: this.input,
						}),
						m("p", m(Button, {
							appearance: "primary",
							size: "lg",
							type: "submit",
						}, "Start Timer")),
					]),
				]
				: [
					m("p.display-1.my-4", [
						m("span", padLeft(Math.floor((this.timerEnd - Date.now()) / 60000).toString(), "0", 2)),
						":",
						m("span", padLeft(Math.floor(((this.timerEnd - Date.now()) / 1000) % 60).toString(), "0", 2)),
					]),
					m(".progress", m(".progress-bar", {
						role: "progressbar",
						style: {
							width: (100 * (this.totalTimerMillis! - this.timerEnd + Date.now()) / this.totalTimerMillis!) + "%",
							transition: "width .2s linear",
						},
					})),
				],
		]
	}

	clearInterval() {
		if (this.intervalId != null) {
			clearInterval(this.intervalId)
		}
	}

	private startTimer() {
		const input = this.input().trim()

		if (input.match(/^\d+\s*s/)) {
			const seconds = parseInt(input.match(/\d+/)![0], 10)
			this.totalTimerMillis = seconds * 1000
		} else if (input.match(/^\d+\s*m/)) {
			const minutes = parseInt(input.match(/\d+/)![0], 10)
			this.totalTimerMillis = minutes * 60 * 1000
		} else if (input.match(/^\d+\s*h/)) {
			const hours = parseInt(input.match(/\d+/)![0], 10)
			this.totalTimerMillis = hours * 60 * 60 * 1000
		} else {
			alert("Invalid time expression")
			return
		}

		this.timerEnd = Date.now() + this.totalTimerMillis

		if (this.intervalId != null) {
			clearInterval(this.intervalId)
		}
		this.intervalId = setInterval(this.tick, 200)
	}

	private tick() {
		if (this.timerEnd == null || Date.now() >= this.timerEnd) {
			this.timerEnd = this.totalTimerMillis = null
			this.clearInterval()
			return
		}
		m.redraw()
	}

}
