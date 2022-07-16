import m from "mithril"
import Stream from "mithril/stream"

// Standard syntax: <https://en.wikipedia.org/wiki/Cron>.
// Go's six-part syntax: <https://pkg.go.dev/github.com/robfig/cron#hdr-Usage>.
// Oracle's seven-part syntax: <https://docs.oracle.com/cd/E12058_01/doc/doc.1014/e12030/cron_expressions.htm>.

class CronValue {
	isAny: boolean
	numValue : null | number
	list: number[]
	period: null | {
		isStar: boolean
		start: number,
		interval: number,
	}

	constructor(input: null | string) {
		this.isAny = input == null || input === "*" || input === "?"
		this.numValue = input != null && input.match(/^\d+$/) ? parseInt(input, 10) : null
		this.period = input != null && input.match(/^(\*|\d+)\/\d+$/) ? {
			isStar: input.startsWith("*/"),
			start: input.startsWith("*/") ? 0 : parseInt(input.split("/")[0], 10),
			interval: parseInt(input.split("/")[1], 10),
		} : null
	}
}

/**
 * Takes a cron expression and produces an explanation.
 */
export function explain(expression: string): string {
	const parts = expression.split(/\s+/)

	const year: null | string = parts.length === 7 ? (parts.pop() as string) : null
	const second: null | string = parts.length === 6 ? (parts.shift() as string) : null
	const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

	const hourNum = parseInt(hour, 10)

	const minuteVal = new CronValue(minute)
	const dayOfMonthVal = new CronValue(dayOfMonth)
	const monthVal = new CronValue(month)
	const yearVal = new CronValue(year)

	let out = ""
	const outParts: (string | number)[] = []

	if (minute === "*") {
		outParts.push("every minute")

	} else if (minute.match(/^(\*|\d+)\/\d+$/)) {
		const [start, period] = minute.split("/")
		outParts.push(`every ${period} minutes`)

	}

	if (hour === "*") {
		if (minute !== "*") {
			outParts.push("every hour")
		}
	} else {
		if (minuteVal.isAny) {
			outParts.push(`starting at ${renderTime(hourNum, 0)} and ending at ${renderTime(hourNum, 59)}, every day`)
		} else if (minuteVal.period != null) {
			const endMinutes = 59 - (59 % minuteVal.period.interval) + minuteVal.period.start
			outParts.push(`starting at ${renderTime(hourNum, 0)} and ending at ${renderTime(hourNum, endMinutes)}, every day`)
		}
	}

	if (dayOfMonthVal.isAny) {
		if (hour !== "*" && !minuteVal.isAny && minuteVal.period == null) {
			outParts.push(`every day at ${renderTime(hourNum, minute)}`)
		}
	}

	if (month === "*") {
		if (!dayOfMonthVal.isAny && hour !== "*" && minute !== "*") {
			outParts.push(`every month on ${dayOfMonth}${numSuffix(dayOfMonth)} at ${renderTime(hourNum, minute)}`)
		}
	}

	if (yearVal.numValue != null) {
		outParts.push("during the year", yearVal.numValue)
	}

	return outParts.join(" ")
}

function renderTime(hour: number, minute: number | string): string {
	return `${hour === 12 ? 12 : hour % 12}:${pad(minute.toString())} ` + (hour === 12 ? "Noon" : (hour < 12 ? "AM" : "PM"))
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
	private explanation: Stream<string>

	static title = "Cron Describe"
	static slug = "cron"

	constructor() {
		this.expression = Stream("0 6 * * *")
		this.explanation = this.expression.map(explain)
	}

	view() {
		return m(".h100.pa1", [
			m("h1", "Cron Describe"),
			m("input.mono", {
				style: {
					fontSize: "2em",
				},
				placeholder: "Cron Expression",
				value: this.expression(),
				oninput: (event: InputEvent) => {
					this.expression((event.target as HTMLInputElement).value)
				},
			}),
			m("p", this.explanation()),
			m("h2", "Quick reference"),
			m("table", [
				m("thead", [
					m("th", "Index"),
					m("th", "Valid Value(s)"),
					m("th", "Details"),
				]),
				m("tbody", [
					m("tr", [
						m("th", 1),
						m("td", "0-60 or *"),
						m("td", "Minute value match"),
					]),
					m("tr", [
						m("th", 2),
						m("td", "0-60 or *"),
						m("td", "Hour value match"),
					]),
					m("tr", [
						m("th", 3),
						m("td", "0-31 or *"),
						m("td", "Day of month"),
					]),
					m("tr", [
						m("th", 4),
						m("td", "1-12 or JAN-DEC or *"),
						m("td", "Month"),
					]),
					m("tr", [
						m("th", 5),
						m("td", "0-6 or SUN-SAT or *"),
						m("td", "Day of week"),
					]),
				]),
			]),
		])
	}
}
