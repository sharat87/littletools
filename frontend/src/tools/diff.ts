import m from "mithril"
import Stream from "mithril/stream"
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { highlightSelectionMatches } from "@codemirror/search"
import * as diff from "diff"
import { Change } from "diff"
import { CodeMirror, ToolView } from "../components"

export default class extends ToolView {
	static title = "Diff"

	editor1: Stream<null | EditorView> = Stream(null)
	decorations1: DecorationSet = Decoration.set([])
	editor2: Stream<null | EditorView> = Stream(null)
	decorations2: DecorationSet = Decoration.set([])

	mainView(): m.Children {
		return [
			m("p", "This tool is beta, and may break on even slightly large files."),
			m(".hstack.align-items-stretch.gap-1.flex-grow-1.min-h-0", [
				m(CodeMirror, {
					hook: this.editor1,
					fitSize: true,
					extensions: [
						highlightSelectionMatches(),
						ViewPlugin.define(
							(view: EditorView): PluginValue => ({
								update: (update: ViewUpdate) => {
									if (update.docChanged && view.hasFocus) {
										this.recomputeDiff(1)
											.catch(console.error)
									}
								},
							}),
							{
								decorations: () => this.decorations1,
							},
						),
						EditorView.domEventHandlers({
							scroll: (event: Event, ev: EditorView) => {
								if (ev.scrollDOM.matches(":hover")) {
									this.editor2()!.scrollDOM.scrollTop = ev.scrollDOM.scrollTop
									this.editor2()!.scrollDOM.scrollLeft = ev.scrollDOM.scrollLeft
								}
							},
						}),
					],
				}),
				m(CodeMirror, {
					hook: this.editor2,
					fitSize: true,
					extensions: [
						ViewPlugin.define(
							(view: EditorView): PluginValue => ({
								update: (update: ViewUpdate) => {
									if (update.docChanged && view.hasFocus) {
										this.recomputeDiff(2)
											.catch(console.error)
									}
								},
							}),
							{
								decorations: () => this.decorations2,
							},
						),
						EditorView.domEventHandlers({
							scroll: (event: Event, ev: EditorView) => {
								if (ev.scrollDOM.matches(":hover")) {
									this.editor1()!.scrollDOM.scrollTop = ev.scrollDOM.scrollTop
									this.editor1()!.scrollDOM.scrollLeft = ev.scrollDOM.scrollLeft
								}
							},
						}),
					],
				}),
			]),
		]
	}

	async recomputeDiff(source: 1 | 2): Promise<void> {
		const text1 = this.editor1()?.state.doc.toString()
		const text2 = this.editor2()?.state.doc.toString()
		if (text1 != null && text2 != null) {
			const delta: null | diff.Change[] = await new Promise((resolve, reject) => {
				diff.diffChars(text1, text2, (err: undefined, value?: Change[]) => {
					if (err != null || value == null) {
						reject(err)
					} else {
						resolve(value)
					}
				})
			})
			if (delta == null) {
				return
			}
			const decs1 = []
			const decs2 = []
			let pos1 = 0
			let pos2 = 0
			const changedMark = Decoration.mark({ class: "diff-changed" })
			const delMark = Decoration.mark({ class: "diff-deleted" })
			for (let i = 0; i < delta.length; ++i) {
				const { value, added, removed } = delta[i]
				if (removed && delta[i + 1]?.added) {
					const next = delta[i + 1]
					decs1.push(changedMark.range(pos1, pos1 + value.length))
					pos1 += value.length
					decs2.push(changedMark.range(pos2, pos2 + next.value.length))
					pos2 += next.value.length
					++i
					continue
				}
				if (removed) {
					decs1.push(delMark.range(pos1, pos1 + value.length))
					pos1 += value.length
				} else if (added) {
					decs2.push(delMark.range(pos2, pos2 + value.length))
					pos2 += value.length
				} else {
					pos1 += value.length
					pos2 += value.length
				}
			}
			this.decorations1 = Decoration.set(decs1)
			this.decorations2 = Decoration.set(decs2)
		} else {
			this.decorations1 = Decoration.set([])
			this.decorations2 = Decoration.set([])
		}
		if (source === 1) {
			this.editor2()?.dispatch()
		} else {
			this.editor1()?.dispatch()
		}
		m.redraw()
	}

}
