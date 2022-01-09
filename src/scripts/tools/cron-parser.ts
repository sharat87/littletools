import m from "mithril"
import Stream from "mithril/stream"

// Standard syntax: <https://en.wikipedia.org/wiki/Cron>.
// Go's six-part syntax: <https://pkg.go.dev/github.com/robfig/cron#hdr-Usage>.

/**
 * Takes a cron expression and produces an explanation of it in English.
 */
export function translateToEnglish(expression: string): string {
	const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.split(/\s+/)

	if (minute === "*") {
		return "every minute"

	} else if (hour === "*") {
		return "every hour at :" + pad(minute)

	} else if (dayOfMonth === "*") {
		return `every day at ${pad(hour)}:${pad(minute)}`

	} else if (month === "*") {
		return `every month on ${dayOfMonth}${numSuffix(dayOfMonth)} at ${pad(hour)}:${pad(minute)}`

	}

	return "this is new, beats me!"
}

/**
 * Pads given string to at least 2 characters in length, with zeroes.
 */
function pad(n: string): string {
	return (n.length < 2 ? "0" : "") + n
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

export default class {
	private expression: Stream<string>
	private english: Stream<string>

	static title = "Cron Parser"

	constructor() {
		this.expression = Stream("0 6 * * *")
		this.english = this.expression.map(translateToEnglish)
	}

	view() {
		return m(".h100.pa1", [
			m("h1", "Cron Parser"),
			m("input", {
				autofocus: true,
				placeholder: "Cron Expression",
				value: this.expression(),
				oninput: (event: InputEvent) => {
					this.expression((event.target as HTMLInputElement).value)
				},
			}),
			m("p", this.english()),
		])
	}
}
