import m from "mithril"
import allTools from "./tools/*"

interface ToolViewInterface extends m.Component {
	title: string
	acceptsDroppedFiles?: boolean
	isHidden?: boolean
}

// Glob imports: <https://parceljs.org/features/dependency-resolution/#glob-specifiers>.
const toolsBySlug: Record<string, ToolViewInterface> = {}
for (const [filename, tool] of Object.entries(allTools as Record<string, { default: ToolViewInterface }>)) {
	toolsBySlug[filename.replace(/\.ts$/, "")] = tool.default
}

export default toolsBySlug
