import m from "mithril"
import { Button, CopyButton, Icon, ToolView } from "../components"
import Stream from "mithril/stream"

// TODO: Configurable stroke width.
// TODO: Snap line to horizontal or vertical when close.

type Shape = {
	type: "number"
	number: number
	x1: number
	y1: number
	x2: number
	y2: number
} | {
	type: "arrow"
	x1: number
	y1: number
	x2: number
	y2: number
} | {
	type: "line"
	x1: number
	y1: number
	x2: number
	y2: number
} | {
	type: "rect"
	x1: number
	y1: number
	x2: number
	y2: number
} | {
	type: "ellipse"
	x1: number
	y1: number
	x2: number
	y2: number
} | {
	type: "censor"
	x1: number
	y1: number
	x2: number
	y2: number
} | {
	type: "emoji"
	char: string
	cx: number
	cy: number
} | {
	type: "text"
	content: string
	x1: number
	y1: number
}

type LineSegment = {
	x1: number
	y1: number
	x2: number
	y2: number
}

export default class extends ToolView {
	static title = "Annotate Image"
	static acceptsDroppedFiles = true

	canvas: null | HTMLCanvasElement = null
	counterNext = 1
	activeTool: Stream<Shape["type"]> = Stream("number")
	backgroundImage: null | HTMLImageElement = null
	imageName: null | string = null
	shapes: Shape[] = []
	incompleteShape: null | Shape = null
	redoStack: Shape[] = []
	censorPattern: null | CanvasPattern = null

	constructor() {
		super()
		const censorCanvas = document.createElement("canvas")
		const size = censorCanvas.width = censorCanvas.height = 6
		const context = censorCanvas.getContext("2d")
		if (context != null) {
			context.strokeStyle = "#c06"
			context.lineCap = "butt"
			context.fillStyle = "#fff"
			context.beginPath()
			context.fillRect(0, 0, size, size)
			context.beginPath()
			context.moveTo(0, size)
			context.lineTo(size, 0)
			context.stroke()
			this.censorPattern = context.createPattern(censorCanvas, "repeat")
		}

		this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this)
		this.onCanvasMouseMoved = this.onCanvasMouseMoved.bind(this)
		this.onCanvasMouseUp = this.onCanvasMouseUp.bind(this)
		this.redrawCanvas = this.redrawCanvas.bind(this)
	}

	oncreate(vnode: m.VnodeDOM): void {
		super.oncreate(vnode)
		this.canvas = vnode.dom.querySelector("canvas")
		if (this.canvas != null && this.canvas.parentElement != null) {
			this.canvas.width = this.canvas.parentElement.offsetWidth
			this.canvas.height = this.canvas.parentElement.offsetHeight
		}
	}

	mainView(): m.Children {
		this.redrawCanvas()
		return [
			m(".hstack.justify-content-between", [
				m(".btn-toolbar.gap-2", [
					m(".btn-group.btn-group-sm", [
						m(
							Button,
							{
								disabled: this.shapes.length === 0,
								appearance: "outline-primary",
								onclick: () => {
									const shape = this.shapes.pop()
									if (shape != null) {
										this.redoStack.push(shape)
										if (shape.type === "number") {
											--this.counterNext
										}
									}
								},
							},
							m(Icon, "undo"),
						),
						m(
							Button,
							{
								disabled: this.redoStack.length === 0,
								appearance: "outline-primary",
								onclick: () => {
									const shape = this.redoStack.pop()
									if (shape != null) {
										this.shapes.push(shape)
										if (shape.type === "number") {
											++this.counterNext
										}
									}
								},
							},
							m(Icon, "redo"),
						),
					]),
					m(".btn-group.btn-group-sm", [
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-number",
							checked: this.activeTool() === "number",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("number")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-number",
							tooltip: "Click to put a number bubble. Drag for an arrow.",
						}, m(Icon, "pin")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-arrow",
							checked: this.activeTool() === "arrow",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("arrow")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-arrow",
						}, m(Icon, "north_east")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-line",
							checked: this.activeTool() === "line",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("line")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-line",
						}, m(Icon, "horizontal_rule")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-rect",
							checked: this.activeTool() === "rect",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("rect")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-rect",
						}, m(Icon, "rectangle")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-ellipse",
							checked: this.activeTool() === "ellipse",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("ellipse")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-ellipse",
						}, m(Icon, "circle")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-censor",
							checked: this.activeTool() === "censor",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("censor")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-censor",
							tooltip: "Click and drag to censor a rectangle with an opaque pattern.",
						}, m(Icon, "texture")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-emoji",
							checked: this.activeTool() === "emoji",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("emoji")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-emoji",
						}, m(Icon, "add_reaction")),
						m("input.btn-check", {
							type: "radio",
							name: "tool",
							id: "tool-text",
							checked: this.activeTool() === "text",
							onchange: (event: Event) => {
								if ((event.target as HTMLInputElement).checked) {
									this.activeTool("text")
								}
							},
						}),
						m("label.btn.btn-outline-primary", {
							for: "tool-text",
							tooltip: "Coming Soon.",
						}, m(Icon, "text_fields")),
					]),
				]),
				m(".btn-group.btn-group-sm", [
					m(
						Button,
						{
							appearance: "outline-secondary",
							onclick: () => {
								const type = "image/png"
								this.canvas?.toBlob((blob: null | Blob) => {
									if (blob == null) {
										return
									}
									const url = URL.createObjectURL(blob)
									const a = document.createElement("a")
									a.href = url
									a.download = this.imageName == null ? "annotated.png"
										: this.imageName.replace(/\.[^.]+$/, (m) => "-annotated" + m)
									a.click()
									URL.revokeObjectURL(url)
								}, type)
							},
						},
						m(Icon, "download"),
					),
					m(
						CopyButton,
						{
							disabled: window.ClipboardItem == null,
							tooltip: window.ClipboardItem == null ? "Not supported in your browser" : undefined,
							appearance: "outline-secondary",
							content: async () => {
								return new Promise((resolve) => {
									this.canvas?.toBlob((blob) => {
										if (blob == null) {
											return
										}
										resolve(blob)
									})
								})
							},
						},
						"Image",
					),
					m(
						CopyButton,
						{
							appearance: "outline-secondary",
							size: "sm",
							content: async () => {
								return this.canvas?.toDataURL()
							},
						},
						"Data URI",
					),
				]),
			]),
			m(".flex-1.overflow-auto", m("canvas.d-block.border", {
				onmousedown: this.onCanvasMouseDown,
				onmousemove: this.onCanvasMouseMoved,
				onmouseup: this.onCanvasMouseUp,
				style: {
					cursor: "crosshair",
				},
			})),
		]
	}

	onCanvasMouseDown(event: MouseEvent) {
		if (event.button !== 0) {
			return
		}

		const context = this.canvas?.getContext("2d")
		if (context == null) {
			return
		}

		const tool = this.activeTool()
		if (tool === "number") {
			this.incompleteShape = {
				type: "number",
				number: this.counterNext++,
				x1: event.offsetX,
				y1: event.offsetY,
				x2: event.offsetX,
				y2: event.offsetY,
			}

		} else if (tool === "arrow" || tool === "line" || tool === "rect" || tool === "ellipse" || tool === "censor") {
			this.incompleteShape = {
				type: tool,
				x1: event.offsetX,
				y1: event.offsetY,
				x2: event.offsetX,
				y2: event.offsetY,
			}

		} else if (tool === "emoji") {
			this.shapes.push({
				type: "emoji",
				char: "💥",
				cx: event.offsetX,
				cy: event.offsetY,
			})

		}

	}

	onCanvasMouseMoved(event: MouseEvent) {
		if (event.buttons === 0) {
			this.incompleteShape = null
			return
		}

		const context = this.canvas?.getContext("2d")
		if (context == null || this.incompleteShape == null) {
			return
		}

		const type = this.incompleteShape.type
		if (type === "number" || type === "arrow" || type === "line" || type === "rect" || type === "ellipse" || type === "censor") {
			this.incompleteShape.x2 = event.offsetX
			this.incompleteShape.y2 = event.offsetY
		}

	}

	onCanvasMouseUp(event: MouseEvent) {
		if (event.button !== 0) {
			return
		}

		const context = this.canvas?.getContext("2d")
		if (context == null || this.incompleteShape == null) {
			return
		}

		const type = this.incompleteShape.type
		if (type === "number") {
			this.shapes.push(this.incompleteShape)

		} else if (type === "arrow" || type === "line" || type === "rect" || type === "ellipse" || type === "censor") {
			this.incompleteShape.x2 = event.offsetX
			this.incompleteShape.y2 = event.offsetY
			this.shapes.push(this.incompleteShape)

		}

		this.incompleteShape = null
		this.redoStack.splice(0, this.redoStack.length)
	}

	openFile(file: File): void {
		const reader = new FileReader()
		reader.onloadend = () => {
			if (typeof reader.result === "string") {
				const image = this.backgroundImage = new Image()
				image.onload = this.redrawCanvas
				image.src = reader.result
				this.imageName = file.name
				this.counterNext = 1
				this.shapes.splice(0, this.shapes.length)
			} else {
				// <https://developer.mozilla.org/en-US/docs/Web/API/FileReader/result#value>.
				console.error("File reading didn't result in a string. This is unexpected.")
			}
		}
		reader.readAsDataURL(file)
	}

	redrawCanvas(): void {
		if (this.canvas == null) {
			return
		}
		const context = this.canvas.getContext("2d")
		if (context == null) {
			return
		}

		context.clearRect(0, 0, this.canvas.width, this.canvas.height)

		if (this.backgroundImage != null) {
			this.canvas.width = this.backgroundImage.naturalWidth
			this.canvas.height = this.backgroundImage.naturalHeight
			this.canvas.getContext("2d")?.drawImage(this.backgroundImage, 0, 0)
		} else if (this.canvas.parentElement != null) {
			// Subtracting the small difference created by the canvas' border.
			this.canvas.width = this.canvas.parentElement.offsetWidth - (this.canvas.offsetWidth - this.canvas.clientWidth)
			this.canvas.height = this.canvas.parentElement.offsetHeight - (this.canvas.offsetHeight - this.canvas.clientHeight)
		}

		for (const shape of this.shapes) {
			this.drawShape(context, shape)
		}

		// TODO: Use another overlay canvas for drawing the incomplete shape. Then we may not have to draw all shapes everytime.
		if (this.incompleteShape != null) {
			this.drawShape(context, this.incompleteShape)
		}
	}

	drawShape(context: CanvasRenderingContext2D, shape: Shape): void {
		if (shape.type === "number") {
			const radius = 16
			if (Math.hypot(shape.x1 - shape.x2, shape.y1 - shape.y2) > 2 * radius) {
				this.drawArrow(context, shape)
			}
			context.fillStyle = "#c06"
			context.beginPath()
			context.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI)
			context.fill()
			context.fillStyle = "#fff"
			context.font = Math.ceil(radius * 1.5) + "px monospace"
			context.textAlign = "center"
			context.textBaseline = "middle"
			context.fillText(String(shape.number), shape.x1, shape.y1 + 3)

		} else if (shape.type === "arrow") {
			this.drawArrow(context, shape)

		} else if (shape.type === "line") {
			this.drawLineSegment(context, shape)

		} else if (shape.type === "rect") {
			context.strokeStyle = "#c06"
			context.lineCap = context.lineJoin = "round"
			context.lineWidth = 3
			context.beginPath()
			context.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1)
			context.stroke()

		} else if (shape.type === "ellipse") {
			context.strokeStyle = "#c06"
			context.lineWidth = 3
			context.beginPath()
			context.ellipse((shape.x1 + shape.x2) / 2, (shape.y1 + shape.y2) / 2, Math.abs(shape.x1 - shape.x2) / 2, Math.abs(shape.y1 - shape.y2) / 2, 0, 0, 2 * Math.PI)
			context.stroke()

		} else if (shape.type === "censor") {
			context.fillStyle = this.censorPattern ?? "#c06"
			context.beginPath()
			context.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1)
			context.fill()

		} else if (shape.type === "emoji") {
			context.font = "40px monospace"
			context.textAlign = "center"
			context.textBaseline = "middle"
			context.fillText(shape.char, shape.cx, shape.cy)

		}
	}

	drawLineSegment(context: CanvasRenderingContext2D, { x1, y1, x2, y2 }: LineSegment): void {
		context.strokeStyle = "#c06"
		context.lineCap = "round"
		context.lineWidth = 3
		context.beginPath()
		context.moveTo(x1, y1)
		context.lineTo(x2, y2)
		context.stroke()
	}

	drawArrow(context: CanvasRenderingContext2D, { x1, y1, x2, y2 }: LineSegment): void {
		this.drawLineSegment(context, { x1, y1, x2, y2 })

		context.fillStyle = "#c06"

		const arrowHeadHypot = 12
		const arrowHeadAngleHalf = Math.PI / 6
		const arrowHeadTipAdvance = arrowHeadHypot / 2

		const theta = Math.atan2(x2 - x1, y2 - y1)

		// xp and yp are the tip point of the arrowhead.
		const xp = x2 + arrowHeadTipAdvance * Math.sin(theta)
		const yp = y2 + arrowHeadTipAdvance * Math.cos(theta)

		context.beginPath()
		context.moveTo(xp, yp)

		context.lineTo(
			x2 - arrowHeadHypot * Math.sin(theta + arrowHeadAngleHalf),
			y2 - arrowHeadHypot * Math.cos(theta + arrowHeadAngleHalf),
		)

		context.lineTo(
			x2 - arrowHeadHypot * Math.sin(theta - arrowHeadAngleHalf),
			y2 - arrowHeadHypot * Math.cos(theta - arrowHeadAngleHalf),
		)

		context.lineTo(xp, yp)
		context.fill()
	}

}
