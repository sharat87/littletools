import m from "mithril"
import Stream from "mithril/stream"
import { Input, ToolView } from "../components"
import { numSuffix } from "../utils"

// Standard syntax: <https://en.wikipedia.org/wiki/Cron>.
// Go's six-part syntax: <https://pkg.go.dev/github.com/robfig/cron#hdr-Usage>.
// Oracle's seven-part syntax: <https://docs.oracle.com/cd/E12058_01/doc/doc.1014/e12030/cron_expressions.htm>.
// AWS CloudWatch syntax: <https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html>.

// TODO: Support `@restart`, `@yearly`, etc.
// TODO: Show last and next run times.
// TODO: Highlight error values, like invalid times, dates, months, etc.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const MONTH_SHORTS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const MONTH_SHORTS_RANGE_PATTERN = new RegExp(`^${ MONTH_SHORTS.join("|") }-${ MONTH_SHORTS.join("|") }$`)
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const WEEKDAY_SHORTS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const WEEKDAY_SHORTS_RANGE_PATTERN = new RegExp(`^${ WEEKDAY_SHORTS.join("|") }-${ WEEKDAY_SHORTS.join("|") }$`)

type Inference = {
	message?: string
	error?: string
}

export function concatenateEnglish(values: string[]): string {
	if (values.length < 2) {
		return values[0] ?? ""
	} else {
		return `${ values.slice(0, -1).join(", ") }, and ${ values[values.length - 1] }`
	}
}

export function computeEffectiveWeekdaysFromSpec(dayOfWeek: string): string[] {
	const days: string[] = []
	for (const spec of dayOfWeek.split(",")) {
		if (spec.match(/^\d+$/)) {
			days.push(WEEKDAYS[parseInt(spec, 10)])
		} else if (WEEKDAY_SHORTS.includes(spec)) {
			days.push(WEEKDAYS[WEEKDAY_SHORTS.indexOf(spec)])
		} else if (spec.match(/^\d+-\d+$/)) {
			const [start, end] = spec.split("-").map(x => parseInt(x, 10))
			if (start > end) {
				throw new Error(`Invalid weekday range '${ spec }'`)
			}
			for (let i = start; ; ++i) {
				days.push(WEEKDAYS[i])
				if (i === end) {
					break
				}
			}
		} else if (spec.match(WEEKDAY_SHORTS_RANGE_PATTERN)) {
			const [start, end] = spec.split("-").map(x => WEEKDAY_SHORTS.indexOf(x))
			if (start > end) {
				throw new Error(`Invalid weekday range '${ spec }'`)
			}
			for (let i = start; ; ++i) {
				days.push(WEEKDAYS[i])
				if (i === end) {
					break
				}
			}
		} else {
			throw new Error(`Invalid weekday spec '${ spec }'`)
		}
	}
	return days
}

function computeEffectiveDatesFromSpec(dayOfMonth: string): string[] {
	const dates: string[] = []
	for (const spec of dayOfMonth.split(",")) {
		if (spec.match(/^\d+$/)) {
			dates.push(`${ spec }${ numSuffix(spec) }`)
		} else if (spec.match(/^\d+-\d+$/)) {
			const [start, end] = spec.split("-")
			dates.push(`${ start }${ numSuffix(start) } to ${ end }${ numSuffix(end) }`)
		} else {
			dates.push(spec)
		}
	}
	return dates
}

export function computeEffectiveMonthsFromSpec(month: string) {
	const months: string[] = []

	for (const spec of month.split(",")) {
		if (spec.match(/^\d+$/)) {
			months.push(MONTHS[parseInt(spec, 10) - 1])

		} else if (MONTH_SHORTS.includes(spec)) {
			months.push(MONTHS[MONTH_SHORTS.indexOf(spec)])

		} else if (spec.match(/^\d+-\d+$/)) {
			const [start, end] = spec.split("-").map(x => parseInt(x, 10))
			if (start > end) {
				throw new Error(`Invalid month range '${ spec }'`)
			}
			months.push(`${ MONTHS[start - 1] } to ${ MONTHS[end - 1] }`)

		} else if (spec.match(MONTH_SHORTS_RANGE_PATTERN)) {
			const [start, end] = spec.split("-").map(x => MONTH_SHORTS.indexOf(x))
			if (start > end) {
				throw new Error(`Invalid month range '${ spec }'`)
			}
			months.push(`${ MONTHS[start] } to ${ MONTHS[end] }`)

		} else {
			throw new Error(`Invalid month spec '${ spec }'`)

		}
	}

	return months
}

export function infer(input: string): Inference[] {
	const messages: Inference[] = []
	const parts = input.split(/\s+/)

	const year: null | string = parts.length === 7 ? (parts.pop() as string) : null
	const second: null | string = parts.length === 6 ? (parts.shift() as string) : null
	const [minuteStr, hourStr, dayOfMonth, month, dayOfWeek] = parts

	if (hourStr === "*" && minuteStr === "*") {
		messages.push({ message: "Every minute" })
	} else if (hourStr === "*") {
		messages.push({
			message: `Every hour, at *:${ pad(minuteStr) }`,
		})
	} else if (minuteStr === "*") {
		messages.push({
			message: `Every minute, from ${ renderTime(parseInt(hourStr, 10), 0) } to ${ renderTime(parseInt(hourStr, 10), 59) }`,
		})
	} else {
		messages.push({
			message: `At ${ renderTime(parseInt(hourStr, 10), parseInt(minuteStr, 10)) }`,
		})
	}

	if (dayOfMonth === "*" && dayOfWeek == "*") {
		messages.push({ message: "Every day" })
	} else if (dayOfMonth === "*") {
		let days: null | string[] = null
		try {
			days = computeEffectiveWeekdaysFromSpec(dayOfWeek)
		} catch (err) {
			messages.push({ error: err.message })
		}
		if (days != null) {
			if (days.length > 6) {
				messages.push({ message: "Every day" })
			} else {
				messages.push({
					message: `Only on: ` + concatenateEnglish(days),
				})
			}
		}
	} else if (dayOfWeek === "*") {
		let dates: null | string[] = null
		try {
			dates = computeEffectiveDatesFromSpec(dayOfMonth)
		} catch (err) {
			messages.push({ error: err.message })
		}
		if (dates != null) {
			messages.push({ message: "Dated: " + concatenateEnglish(dates) })
		}
	} else {
		let dates: null | string[] = null
		let days: null | string[] = null
		try {
			dates = computeEffectiveDatesFromSpec(dayOfMonth)
			days = computeEffectiveWeekdaysFromSpec(dayOfWeek)
		} catch (err) {
			messages.push({ error: err.message })
		}
		if (dates != null && days != null) {
			let msg = "Dated: " + concatenateEnglish(dates)
			if (days.length < 7) {
				msg += "; but only on " + concatenateEnglish(days)
			}
			messages.push({ message: msg })
		}
	}

	if (month === "*") {
		messages.push({ message: "Every month" })
	} else {
		let parts: null | string[] = null
		let errored: boolean = false
		try {
			parts = computeEffectiveMonthsFromSpec(month)
		} catch (err) {
			messages.push({ error: err.message })
			errored = true
		}
		if (parts != null) {
			messages.push({ message: "During: " + concatenateEnglish(parts) })
		} else if (!errored) {
			messages.push({ error: `Got null parts for: '${ month }'` })
		}
	}

	if (year != null && year !== "*" && year !== "") {
		const years: string[] = []
		for (const spec of year.split(",")) {
			if (spec.match(/^\d+$/)) {
				years.push(spec)
			} else if (spec.match(/^\d+-\d+$/)) {
				const [start, end] = spec.split("-")
				years.push(`${ start } to ${ end }`)
			} else {
				years.push(spec)
			}
		}
		messages.push({ message: "Year(s): " + concatenateEnglish(years) })
	}

	return messages
}

function renderTime(hour: number, minute: number | string): string {
	return `${ hour === 12 ? 12 : hour % 12 }:${ pad(minute.toString()) } ` + (hour === 12 ? "Noon" : (hour < 12 ? "AM" : "PM"))
}

/**
 * Pads given string to at least 2 characters in length, with zeroes.
 */
function pad(n: string): string {
	return (n.length < 2 ? "0" : "") + n
}

export default class extends ToolView {
	static title = "Cron Describe"

	private readonly input = Stream("0 6 * * *")
	private readonly inferences = this.input.map(infer)

	mainView(): m.Children {
		return [
			m(Input, {
				class: "fs-3 font-monospace",
				placeholder: "Cron Expression",
				model: this.input,
			}),
			m("ul.my-3", this.inferences().map((inf: Inference) => {
				return m("li", {
					class: inf.error != null ? "text-danger" : "",
				}, inf.error ?? inf.message)
			})),
			m("h2", "Quick reference"),
			m("table.table.table-bordered", [
				m("thead", m("tr", [
					m("th", "#"),
					m("th", "Valid Value(s)"),
					m("th", "Details"),
				])),
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
		]
	}
}
