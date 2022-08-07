import m from "mithril"
import { Input } from "~src/components"
import Stream from "mithril/stream"
import toolsBySlug from "~src/toolpack"

export class View implements m.ClassComponent {
	private readonly isVisible: Stream<boolean>
	private readonly needle: Stream<string>
	private readonly results: Stream<FindResult[]>
	private readonly selectedIndex: Stream<number>

	constructor() {
		this.isVisible = Stream(false)
		this.needle = Stream("")
		this.results = this.needle.map(needle => {
			return findResults(needle)
		})
		this.selectedIndex = Stream(0)

		this.isVisible.map(() => this.needle(""))
		this.results.map(() => this.selectedIndex(0))
	}

	oncreate(): void {
		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				this.isVisible(false)
				m.redraw()
			} else if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "K") {
				this.isVisible(true)
				m.redraw()
			}
		})
	}

	onupdate(vnode: m.VnodeDOM<{}, this>): any {
		if (this.isVisible()) {
			vnode.dom.querySelector(".active")?.scrollIntoView({ block: "center" })
		}
	}

	view(): m.Children {
		return this.isVisible() && [
			m(".modal", { style: "display: block; pointer-events: none" }, m(".modal-dialog.modal-dialog-scrollable", m(".modal-content.shadow-lg", [
				m(".modal-body.p-0.vstack", [
					m("form", m(Input, {
						autofocus: true,
						placeholder: "Search LittleTools",
						class: "fs-4",
						model: this.needle,
						onkeydown: (event: KeyboardEvent) => {
							if (event.key === "ArrowDown") {
								this.selectedIndex(Math.min(this.selectedIndex() + 1, this.results().length - 1))
								event.preventDefault()
							} else if (event.key === "ArrowUp") {
								this.selectedIndex(Math.max(this.selectedIndex() - 1, 0))
								event.preventDefault()
							} else if (event.key === "Enter") {
								const slug = this.results()[this.selectedIndex()].slug
								this.isVisible(false)
								event.preventDefault()
								m.route.set(slug)
							} else if (event.key === "Escape") {
								this.isVisible(false)
							}
						},
					})),
					this.results().length > 0 && m("ul.list-group.list-group-flush.flex-grow-1.overflow-auto", this.results().map((result, i) => {
						return m("li.list-group-item", {
							class: this.selectedIndex() === i ? "active" : "",
						}, result.title)
					})),
				]),
			]))),
		]
	}

}

interface FindResult {
	title: string
	slug: string
}

function findResults(needle: string): FindResult[] {
	const results: FindResult[] = []
	const needleValue = needle.toLowerCase()

	if (needleValue.length === 0) {
		return results
	}

	for (const [slug, tool] of Object.entries(toolsBySlug)) {
		if (tool.title.toLowerCase().includes(needleValue)) {
			results.push({
				title: tool.title,
				slug,
			})
		}
	}

	return results
}
