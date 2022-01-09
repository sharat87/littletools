import m from "mithril"

export default class {
	mode: null | string
	encoded: string
	encodedDataUri: string
	decoded: string

	static title = "Base64 Encode/Decode"

	constructor() {
		this.mode = null
		this.encoded = ""
		this.encodedDataUri = ""
		this.decoded = ""
	}

	view(vnode: m.Vnode): m.Children {
		let decodedType: string
		let decodedView: m.Children = null

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
			decodedType = "GIF Image"
			decodedView = m("img", {
				src: "data:image/webp;base64," + this.encoded,
			})

		} else {
			decodedType = "text"
			decodedView = m("textarea", {
				placeholder: "Decoded plain text here",
				value: this.decoded,
				onfocus: () => {
					this.mode = "encode"
				},
				oninput: (event) => {
					if (this.mode === "encode") {
						this.decoded = event.target.value
						this.encoded = btoa(this.decoded)
					}
				},
			})

		}

		return m(".h100.pa1", { ondragover, ondragleave, ondrop }, [
			m("h1", "Encode and decode with Base64"),
			m("p", "Supports both text and images. Go on, drop a file here."),
			m("h2", "Encoded:"),
			m("textarea", {
				placeholder: "Encoded text here",
				value: this.encoded,
				onfocus: () => {
					this.mode = "decode"
				},
				oninput: (event) => {
					if (this.mode === "decode") {
						this.encoded = event.target.value
						// TODO: The encoded content can be a data: URI. Handle that case.
						this.decoded = atob(this.encoded)
					}
				},
			}),
			m("h2", `Plain ${decodedType}:`),
			decodedView,
			vnode.state.isDragging && m(".file-drag-mask", "Drop file to encode with base64."),
		])

		// This event fires continuously forcing Mithril to redraw repeatedly. Can we do something about it?
		function ondragover(event: DragEvent): void {
			vnode.state.isDragging = true
			event.preventDefault()
		}

		function ondragleave() {
			vnode.state.isDragging = false
			m.redraw()
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
									this.encodedDataUri = reader.result
									this.encoded = this.encodedDataUri.replace(/^[^,]+,/, "")
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

}
