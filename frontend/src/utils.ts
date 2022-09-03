import m from "mithril"

export function padLeft(input: any, padding: string, length: number): string {
	input = input.toString()
	while (input.length < length) {
		input = padding + input
	}
	return input
}

export function padRight(input: any, padding: string, length: number): string {
	input = input.toString()
	while (input.length < length) {
		input += padding
	}
	return input
}

export function copyToClipboard(content: string | Blob): void {
	if (typeof content === "string") {
		navigator.clipboard.writeText(content)
			.catch(err => console.error("Error copying", err))
	} else {
		navigator.clipboard.write([new ClipboardItem({ [content.type]: content })])
			.catch(err => console.error("Error copying", err))
	}
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
	ghost.style.animation = `ghost-${ rect.y < 100 ? "dn" : "up" } 1s ease-out`
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

export const DNSRecordTypes = ["A", "AAAA", "CNAME", "MX", "TXT"] as const

export type DNSRecordType = typeof DNSRecordTypes[number]

// Ref: <https://developers.google.com/speed/public-dns/docs/doh/json#dns_response_in_json>.
export type DNSResult = {
	Status: number
	Answer?: DNSAnswer[]
	Comment?: string
}

export type DNSAnswer = {
	name: string
	type: number
	TTL: number
	data: string
}

export const DNS_RR_CODES: Record<DNSRecordType, number> = {
	"A": 1,
	"AAAA": 28,
	"CNAME": 5,
	"TXT": 16,
	"MX": 15,
}

export function resolveDNS(host: string, type: DNSRecordType): Promise<DNSResult> {
	// Ref: <https://developers.google.com/speed/public-dns/docs/doh/json>.
	return m.request<DNSResult>(`https://dns.google.com/resolve?name=${ host }&type=${ type }`)
}
