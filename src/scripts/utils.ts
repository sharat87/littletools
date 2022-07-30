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
	ghost.className = "position-fixed d-flex align-items-center justify-content-center"
	ghost.style.left = rect.x + "px"
	ghost.style.top = rect.y + "px"
	ghost.style.minWidth = rect.width + "px"
	ghost.style.height = rect.height + "px"
	ghost.style.zIndex = "500"
	ghost.style.cursor = "default"
	ghost.style.pointerEvents = "none"
	ghost.style.animation = "ghost 1s ease-out"
	ghost.style.pageBreakInside = "avoid"
	ghost.addEventListener("animationend", ghost.remove.bind(ghost))
	document.body.appendChild(ghost)
}

export function numSuffix(n: string): string {
	const lastChar = n[n.length - 1]

	if (n[n.length - 2] !== "1") {
		if (lastChar === "1") {
			return "st"

		} else if (lastChar === "2") {
			return "nd"

		} else if (lastChar === "3") {
			return "rd"

		}
	}

	return "th"
}
