import m from "mithril"
import Stream from "mithril/stream"
import { Textarea } from "../components"

export default {
	title: "Diff",
	oninit,
	view,
}

interface State {
	left: Stream<string>
	right: Stream<string>
	diff: string
}

function oninit(vnode: m.Vnode<never, State>) {
	vnode.state.left = Stream("")
	vnode.state.right = Stream("")
	vnode.state.diff = ""
}

function view(vnode: m.Vnode<never, State>): m.Children {
	return m(".container", { ondragover, ondragleave, ondrop }, [
		m("h1", "Diff"),
		m(Textarea, {
			model: vnode.state.left,
		}),
		m(Textarea, {
			model: vnode.state.right,
		}),
	])
}
