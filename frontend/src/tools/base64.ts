import m from "mithril"
import { CopyButton, Textarea } from "../components"

export default {
	title: "Base64 Encode/Decode",
	oninit,
	view,
}

interface State {
	mode: null | string
	encoded: string
	encodedDataUri: string
	decoded: string
	isDragging: boolean
}

function oninit() {
	this.mode = null
	this.encoded = ""
	this.encodedDataUri = ""
	this.decoded = ""
	this.isDragging = false
}

function view(vnode: m.Vnode<never, State>): m.Children {
	let decodedType: string
	let decodedView: m.Children = null
	console.log("encoded is", this.encoded)

	// Image identification from base64 from <https://stackoverflow.com/a/50111377/151048>.
	if (this.encoded[0] === "i") {
		decodedType = "PNG Image"
		decodedView = m("img", {
			src: "data:image/png;base64," + this.encoded,
		})

	} else if (this.encoded[0] === "/") {
		decodedType = "JPEG Image"
		decodedView = m("img", {
			src: "data:image/jpg;base64," + this.encoded,
		})

	} else if (this.encoded[0] === "R") {
		decodedType = "GIF Image"
		decodedView = m("img", {
			src: "data:image/gif;base64," + this.encoded,
		})

	} else if (this.encoded[0] === "U") {
		decodedType = "WEBP Image"
		decodedView = m("img", {
			src: "data:image/webp;base64," + this.encoded,
		})

	} else {
		decodedType = "text"
		decodedView = m(Textarea, {
			id: "decodedInput",
			class: "flex-grow-1",
			placeholder: "Decoded plain text here",
			value: this.decoded,
			onfocus: () => {
				this.mode = "encode"
			},
			onChange: (value: string) => {
				if (this.mode === "encode") {
					this.decoded = value
					this.encoded = window.btoa(this.decoded)
				}
			},
		})

	}

	return m(".container.d-flex.flex-column.h-100.pb-3", { ondragover, ondragleave, ondrop }, [
		m("h1", "Encode and decode with Base64"),
		m("p", "Supports both text and images. Go on, drop a file here."),
		m("label.fs-3", {
			for: "encodedInput",
			class: "form-label",
		}, "Encoded:"),
		m(Textarea, {
			id: "encodedInput",
			class: "flex-grow-1",
			placeholder: "Encoded text here",
			value: this.encoded,
			onfocus: () => {
				this.mode = "decode"
			},
			onChange: (value: string) => {
				if (this.mode === "decode") {
					this.encoded = value
					// TODO: The encoded content can be a data: URI. Handle that case.
					this.decoded = window.atob(this.encoded)
				}
			},
		}),
		m(".btn-toolbar.my-2", m(".btn-group", [
			m(CopyButton, { content: this.encoded }, "Copy encoded"),
			m(CopyButton, { content: this.encodedDataUri }, "Copy encoded as data URL"),
		])),
		m("label.fs-3", {
			for: "decodedInput",
			class: "form-label",
		}, `Plain ${ decodedType }:`),
		decodedView,
		this.isDragging && m(".file-drag-mask", "Drop file to encode with base64."),
	])

	function ondragover(event: DragEvent): void {
		vnode.state.isDragging = true
		event.preventDefault()
	}

	function ondragleave() {
		vnode.state.isDragging = false
	}

	function ondrop(event: DragEvent) {
		vnode.state.isDragging = false
		event.preventDefault()

		if (event.dataTransfer?.items) {
			for (const item of event.dataTransfer.items) {
				if (item.kind === "file") {
					const file = item.getAsFile()
					if (file != null) {
						console.log(file.name, file)
						const reader = new FileReader()
						reader.onloadend = () => {
							if (typeof reader.result === "string") {
								vnode.state.encodedDataUri = reader.result
								vnode.state.encoded = vnode.state.encodedDataUri.replace(/^[^,]+,/, "")
								m.redraw()
							} else {
								// <https://developer.mozilla.org/en-US/docs/Web/API/FileReader/result#value>.
								console.error("File reading didn't result in a string. This is unexpected.")
							}
						}
						reader.readAsDataURL(file)
					}
					// TODO: Dropping multiple files to encode as base64
					break
				}
			}

		} else {
			// Use DataTransfer interface to access the file(s)
			// New interface handlign: vnode.state.files = event.dataTransfer.files

		}
		m.redraw()
	}

}
