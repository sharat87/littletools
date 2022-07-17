export function pad(s: string, c: string, n: number): string {
	while (s.length < n) {
		s = c + s
	}
	return s
}

export function copyToClipboard(text: string): void {
	navigator.clipboard.writeText(text)
		.catch(err => console.error("Error copying", err))
}

export function downloadText(text: string, filename = "file.txt"): void {
	const el = document.createElement("a")
	el.style.display = "none"
	el.setAttribute("download", filename)
	el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
	document.body.append(el)
	el.click()
	el.remove()
}

export function showGhost(el: Element, text = "Copied!"): void {
	const rect = el.getBoundingClientRect()
	const ghost = document.createElement("div")
	ghost.innerText = text
	ghost.style.position = "fixed"
	ghost.style.left = rect.x + "px"
	ghost.style.top = rect.y + "px"
	ghost.style.minWidth = rect.width + "px"
	ghost.style.height = rect.height + "px"
	ghost.style.fontWeight = "bold"
	ghost.style.zIndex = "500"
	ghost.style.display = "flex"
	ghost.style.justifyContent = ghost.style.alignItems = "center"
	ghost.style.cursor = "default"
	ghost.style.pointerEvents = "none"
	ghost.style.animation = "ghost 1s ease-out"
	ghost.style.pageBreakInside = "avoid"
	ghost.addEventListener("animationend", ghost.remove.bind(ghost))
	document.body.appendChild(ghost)
}
