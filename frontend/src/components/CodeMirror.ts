import m from "mithril"
import { EditorState, Extension } from "@codemirror/state"
import {
	crosshairCursor,
	drawSelection,
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	rectangularSelection,
	ViewUpdate
} from "@codemirror/view"
import type { TagStyle } from "@codemirror/language"
import {
	bracketMatching,
	foldGutter,
	foldKeymap,
	HighlightStyle,
	indentOnInput,
	syntaxHighlighting
} from "@codemirror/language"
import { Tag, tags as t } from "@lezer/highlight"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { lintKeymap } from "@codemirror/lint"

// Examples: https://github.com/craftzdog/cm6-themes/blob/main/packages/basic-light/src/index.ts

const tagsByClass: Record<string, Tag[]> = {
	"h-keyword": [t.keyword],
	"h-number": [t.number],
	"h-tag": [t.tagName],
	"h-string": [t.string],
	"h-comment": [t.comment],
	"h-invalid": [t.invalid],
}

// Default is in @codemirror/language/dist/index.js:defaultHighlightStyle
export const classHighlightStyle = HighlightStyle.define(
	Object.entries(tagsByClass)
		.map(([className, tag]): TagStyle => ({ tag, class: className }))
)

export const commonKeymap: typeof defaultKeymap = defaultKeymap.map((keyBinding) => {
	if (keyBinding.key === "Mod-Enter") {
		keyBinding.key = "Shift-Enter"
	}
	return keyBinding
})

const commonSetup: Extension = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	drawSelection(),
	dropCursor(),
	EditorState.allowMultipleSelections.of(true),
	indentOnInput(),
	syntaxHighlighting(classHighlightStyle),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	rectangularSelection(),
	crosshairCursor(),
	highlightActiveLine(),
	highlightSelectionMatches(),
	keymap.of([
		...closeBracketsKeymap,
		...commonKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap,
		...lintKeymap,
	]),
]

export function cmdEnterKeymap(fn: (target: EditorView) => boolean): Extension {
	return keymap.of([
		{ key: "Ctrl-Enter", run: fn },
		{ key: "Cmd-Enter", run: fn },
	])
}

const codeMirrorFullFlexSizing = EditorView.theme({
	"&": {
		flex: 1,
		minHeight: 0,
	},
	"& .cm-scroller": {
		minWidth: 0,
	},
})

interface CodeMirrorAttrs {
	hook?: (editor: EditorView) => void
	doc?: string
	fitSize?: boolean
	onDocChanged?: (update: ViewUpdate) => boolean | void
	extensions?: Extension[]
}

export class CodeMirror implements m.ClassComponent<CodeMirrorAttrs> {
	editor: null | EditorView = null

	oncreate(vnode: m.VnodeDOM<CodeMirrorAttrs>): void {
		const extensions: Extension[] = [
			commonSetup,
			EditorView.updateListener.of((update: ViewUpdate): boolean => {
				if (update.docChanged && vnode.attrs.onDocChanged) {
					return vnode.attrs.onDocChanged(update) ?? false
				}
				return false
			}),
		]

		if (vnode.attrs.fitSize) {
			extensions.push(codeMirrorFullFlexSizing)
		}

		if (vnode.attrs.extensions) {
			extensions.push(...vnode.attrs.extensions)
		}

		this.editor = new EditorView({
			doc: vnode.attrs.doc || "",
			extensions,
		})

		vnode.dom.replaceWith(this.editor.dom)
		vnode.attrs.hook?.(this.editor)
		this.editor.focus()
	}

	onbeforeremove(): void {
		this.editor?.destroy()
	}

	view(vnode: m.Vnode<CodeMirrorAttrs>): m.Children {
		return m("div")
	}
}
