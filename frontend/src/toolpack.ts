import m from "mithril"
import allTools from "./tools/*"

interface ToolComponent extends m.Component {
	title: string
}

// Glob imports: <https://parceljs.org/features/dependency-resolution/#glob-specifiers>.
const toolsBySlug: Record<string, ToolComponent> = {}
for (const [filename, tool] of Object.entries(allTools as Record<string, { default: ToolComponent }>)) {
	toolsBySlug[filename.replace(/\.ts$/, "")] = tool.default
}

export default toolsBySlug
