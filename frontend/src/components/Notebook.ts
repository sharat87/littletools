import m from "mithril"

type NotebookAttrs = {
	class?: string
	tabs: Record<string, (() => m.Children)>
}

export class Notebook implements m.ClassComponent<NotebookAttrs> {
	currentTab: null | string

	constructor() {
		this.currentTab = null
	}

	view(vnode: m.Vnode<NotebookAttrs>): m.Children {
		const { tabs } = vnode.attrs

		if (this.currentTab == null || tabs[this.currentTab] == null) {
			this.currentTab = Object.keys(tabs)[0]
		}

		return m(".vstack", { class: vnode.attrs.class }, [
			m("ul.nav.nav-tabs", Object.keys(tabs).map(
				(key) => m("li.nav-item", m("a.nav-link", {
					href: "#",
					class: this.currentTab === key ? "active" : undefined,
					onclick: (event: MouseEvent) => {
						event.preventDefault()
						this.currentTab = key
					},
				}, key)),
			)),
			m(
				".p-2.border-start.border-end.border-bottom.flex-grow-1.vstack.gap-2.min-h-0.overflow-auto",
				this.currentTab != null && tabs[this.currentTab](),
			),
		])
	}
}
