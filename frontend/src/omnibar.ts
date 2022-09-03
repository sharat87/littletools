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
			m(".modal-backdrop.fade.show", {
				onclick: () => {
					this.isVisible(false)
				},
			}),
			m(".modal.d-block.pe-none", m(".modal-dialog.modal-dialog-scrollable", m(".modal-content", [
				m(".modal-body.p-0.vstack", [
					m("form", m(Input, {
						autofocus: true,
						placeholder: "Search LittleTools",
						class: "fs-4 border-0 shadow-none rounded-0",
						model: this.needle,
						onkeydown: (event: KeyboardEvent) => {
							if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey) || (event.key === "n" && event.ctrlKey)) {
								this.selectedIndex(Math.min(this.selectedIndex() + 1, this.results().length - 1))
								event.preventDefault()
							} else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey) || (event.key === "p" && event.ctrlKey)) {
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
					this.results().length > 0
						? m("ul.list-group.list-group-flush.flex-grow-1.overflow-auto.border-top", this.results().map((result, i) => {
							return m("li.list-group-item", {
								class: this.selectedIndex() === i ? "active" : "",
							}, result.markedTitle)
						}))
						: (this.needle() && m(".text-muted.p-3.fs-4.fst-italic.border-top", "No results found.")),
				]),
			]))),
		]
	}

}

interface FindResult {
	title: string
	slug: string
	markedTitle: m.Vnode
	weight: number
}

function findResults(needle: string): FindResult[] {
	const results: FindResult[] = []
	const needleValue = needle.toLowerCase()

	if (needleValue.length === 0) {
		return results
	}

	const lenNeedle = needleValue.length

	for (const [slug, tool] of Object.entries(toolsBySlug)) {
		const haystack = tool.title.toLowerCase()
		const lenHaystack = haystack.length
		const indices: number[] = []
		let weight = 0, i = 0, j = 0, lastMatchJ = -1

		while (i < lenNeedle && j < lenHaystack) {
			if (needleValue[i] === haystack[j]) {
				indices.push(j)
				weight += 10

				if (lastMatchJ + 1 == j) {
					weight += 40
				}

				weight -= 4 * (i - lastMatchJ - 1)  // See graph of `y=4(x-1)`.

				if (j === 0 || haystack[j - 1] === " ") {
					weight += 10
					if (i === 0) {
						weight += 25
					}
					if (j === 0) {
						weight += 25
					}
				}

				lastMatchJ = j
				++i
			}

			++j
		}

		if (i === lenNeedle) {
			results.push({
				title: tool.title,
				slug,
				markedTitle: mark(tool.title, indices),
				weight,
			})
		}
	}

	results.sort((a: FindResult, b: FindResult) => b.weight - a.weight)
	return results
}

function mark(title: string, indices: number[]): m.Vnode {
	for (let i = indices.length - 1; i >= 0; --i) {
		title = title.slice(0, indices[i]) + "<mark>" + title.slice(indices[i], indices[i] + 1) + "</mark>" + title.slice(indices[i] + 1)
	}
	return m.trust(title)
}
