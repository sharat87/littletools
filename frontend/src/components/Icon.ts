import m from "mithril"

type IconAttrs = {
	tooltip?: string
}

// Icons Ref: <https://fonts.google.com/icons>.
export class Icon implements m.ClassComponent<IconAttrs> {
	view(vnode: m.Vnode<IconAttrs>) {
		return m(".material-symbols-outlined", vnode.attrs, vnode.children)
	}
}
