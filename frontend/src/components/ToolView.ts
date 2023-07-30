import m from "mithril"
import Bus from "../bus"
import { ToolContainer } from "./ToolContainer"

export enum Layout {
	App,
	Page,
}

export abstract class ToolView implements m.ClassComponent {
	static title = "Tool"
	static acceptsDroppedFiles = false

	static readonly Layout = Layout
	static layout: Layout = Layout.App

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
		const attrs: Record<string, unknown> = {
			class: (this.constructor as typeof ToolView).layout === Layout.App ? "h-100 vstack gap-2" : undefined,
		}

		if ((this.constructor as { acceptsDroppedFiles?: boolean }).acceptsDroppedFiles) {
			attrs.ondragover = this.ondragover
			attrs.ondragleave = this.ondragleave
			attrs.ondrop = this.ondrop
		}

		return m(ToolContainer, attrs, [
			m(".hstack", [
				m("h1.flex-grow-1.mb-0", (this.constructor as { title?: string }).title),
				this.headerEndView(),
			]),
			this.mainView(),
			this.#isDragging && [
				m(".modal.d-block.pe-none", m(".modal-dialog", m(".modal-content", m(".modal-header", m("h5.modal-title", "Drop file"))))),
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

	openDataTransfer(dataTransfer: DataTransfer): void {
		throw new Error("Opening dropped data is not implemented!")
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
			if (this.openDataTransfer != null) {
				this.openDataTransfer(event.dataTransfer)
			} else {
				for (const item of event.dataTransfer.items) {
					if (item.kind === "file") {
						const file = item.getAsFile()
						if (file != null) {
							this.openFile(file)
						}
						// TODO: Dropping multiple files, if the tool supports it.
						break
					}
				}
			}

		} else {
			// Use DataTransfer interface to access the file(s)
			// New interface handling: vnode.state.files = event.dataTransfer.files

		}
		m.redraw()
	}
}
