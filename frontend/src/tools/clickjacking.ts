import m from "mithril"
import Stream from "mithril/stream"
import { Button, CopyButton, Input } from "~/src/components"

export default class implements m.ClassComponent {
	static title = "Clickjacking Tester"
	private buttonLeft: number
	private buttonTop: number
	private dragOffsetLeft: number
	private dragOffsetTop: number
	private isDragging: boolean
	private readonly enableMovingButton: Stream<boolean>
	private hiddenLayerOpacity: number
	private readonly locationInput: Stream<string>
	private readonly frameSrc: Stream<string>

	constructor() {
		this.buttonLeft = 20
		this.buttonTop = 60
		this.dragOffsetLeft = 0
		this.dragOffsetTop = 0
		this.isDragging = false
		this.enableMovingButton = Stream(false)
		this.hiddenLayerOpacity = 50
		this.locationInput = Stream(`${ window.location.protocol }//${ window.location.host }`)
		this.frameSrc = Stream("")
		this.onMouseMove = this.onMouseMove.bind(this)
	}

	oncreate() {
		const rawData = window.location.search
		if (rawData != null) {
			const data = JSON.parse(window.atob(rawData.substring(1)))
			this.buttonLeft = data.buttonLeft
			this.buttonTop = data.buttonTop
			this.locationInput(data.location)
			this.hiddenLayerOpacity = data.opacity
			this.loadFrame()
			m.redraw()
		}
	}

	view() {
		return m(".container.h-100.d-flex.flex-column.vstack", [
			m(".hstack", [
				m("h1.flex-grow-1", "Clickjacking Tester"),
				m(CopyButton, {
					size: "sm",
					appearance: "outline-secondary",
					content: (): string => {
						const data = window.btoa(JSON.stringify({
							buttonLeft: this.buttonLeft,
							buttonTop: this.buttonTop,
							location: this.locationInput(),
							opacity: this.hiddenLayerOpacity,
						}))
						return `${ window.location.protocol }//${ window.location.host }${ window.location.pathname }?${ data }`
					},
				}, "Copy Permalink"),
			]),
			m(
				"form.row",
				{
					onsubmit: (event: SubmitEvent) => {
						event.preventDefault()
						this.loadFrame()
					},
				},
				[
					m(".col-auto.hstack", [
						m(Input, {
							type: "checkbox",
							id: "enableMovingButton",
							model: this.enableMovingButton,
						}),
						m("label.ms-2", {
							for: "enableMovingButton",
						}, "Enable Dragging Button"),
					]),
					m(".col-auto", m(".input-group", [
						m(Input, {
							placeholder: "Hidden frame URL",
							model: this.locationInput,
						}),
						m("button.btn.btn-outline-primary", "Go"),
					])),
					m(".col-auto.hstack", [
						m("label.me-2", {
							for: "hiddenLayerOpacity",
						}, "Hidden frame opacity:"),
						m("input", {
							id: "hiddenLayerOpacity",
							type: "range",
							min: 1,
							value: this.hiddenLayerOpacity,
							oninput: (event: InputEvent) => {
								this.hiddenLayerOpacity = (event.target as HTMLInputElement).valueAsNumber
							},
						}),
					]),
				],
			),
			m(".position-relative.flex-grow-1.my-2.border", [
				m(Button, {
					class: "position-absolute",
					style: {
						left: this.buttonLeft + "px",
						top: this.buttonTop + "px",
						cursor: "move",
					},
					onmousedown: (event: MouseEvent) => {
						this.isDragging = true
						this.dragOffsetLeft = event.pageX - this.buttonLeft
						this.dragOffsetTop = event.pageY - this.buttonTop
						event.preventDefault()
						document.addEventListener("mousemove", this.onMouseMove)
					},
				}, "Button claiming an innocent action"),
				m("iframe.position-absolute.h-100.w-100", {
					src: this.frameSrc(),
					style: {
						opacity: this.hiddenLayerOpacity / 100,
						pointerEvents: this.enableMovingButton() ? "none" : "auto",
					},
				}),
			]),
		])
	}

	onMouseMove(event: MouseEvent) {
		if (event.buttons === 0) {
			this.isDragging = false
			document.removeEventListener("mousemove", this.onMouseMove)
			return
		}
		this.buttonLeft = event.pageX - this.dragOffsetLeft
		this.buttonTop = event.pageY - this.dragOffsetTop
		m.redraw()
	}

	loadFrame() {
		const url = this.locationInput()
		if (!url.match(/^https?:\/\//)) {
			this.locationInput(window.location.protocol + "//" + url)
		}

		this.frameSrc(this.locationInput())
	}
}
