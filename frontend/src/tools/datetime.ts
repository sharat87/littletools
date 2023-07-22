import m from "mithril"
import Stream from "mithril/stream"
import { CopyButton, Input, ToolView } from "~/src/components"
import { numSuffix, padLeft } from "../utils"

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const UNIT_FULL_NAMES: Record<string, string> = {
	d: "day",
	h: "hour",
	m: "minute",
	s: "second",
	ms: "millisecond",
}

interface Result {
	view(): m.Children
}

export class DateTimePointResult implements Result {
	constructor(readonly dateTime: Date) {
	}

	view(): m.Children {
		const date: Date = this.dateTime
		return [
			m("p.fs-2", [
				WEEKDAYS_SHORT[date.getDay()],
				", ",
				date.getDate(),
				m("sup", numSuffix(date.getDate().toString())),
				" ",
				MONTHS_SHORT[date.getMonth()],
				" ",
				date.getFullYear(),
				", ",
				date.getHours() % 12 || 12,
				":",
				date.getMinutes(),
				":",
				padLeft(date.getSeconds().toString(10), "0", 2),
				" ",
				date.getHours() < 12 ? "AM" : "PM",
				" Local",
			]),
			m("table.table.table-bordered.table-hover.align-middle", m("tbody", [
				m(OutputRow, {
					label: "Local",
					value: date.toString(),
				}),
				m(OutputRow, {
					label: "ISO UTC",
					value: date.toISOString(),
				}),
				m(OutputRow, {
					label: "Milliseconds since epoch",
					value: date.getTime(),
				}),
				m(OutputRow, {
					label: "Seconds since epoch",
					value: Math.round(date.getTime() / 1000),
				}),
			])),
		]
	}
}

class UnitConversionResult implements Result {
	constructor(
		readonly inCount: number,
		readonly inUnit: string,
		readonly outCount: number,
		readonly outUnit: string,
	) {
	}

	toString(): string {

		return [
			this.inCount,
			UNIT_FULL_NAMES[this.inUnit] ?? this.inUnit,
			"is",
			this.outCount,
			UNIT_FULL_NAMES[this.outUnit] ?? this.outUnit,
		].join(" ")
	}

	view(): m.Children {
		return m("p.fs-2", this.toString())
	}
}

class DurationResult implements Result {
	readonly unit: string

	constructor(readonly count: number, unit: string) {
		this.unit = normalizeTimeUnit(unit)
	}

	view(): m.Children {
		return m("p.fs-2", [
			this.count,
			" ",
			UNIT_FULL_NAMES[this.unit],
			this.count === 1 ? "" : "s",
		])
	}
}

// @ts-ignore
const CITY_TO_ZONE: Record<string, string> = Intl.supportedValuesOf("timeZone").reduce(
	(acc: Record<string, string>, zone: string) => {
		try {
			acc[zone.split("/")[1].replace(/_/g, "").toLowerCase()] = zone
		} catch (e) {
		}
		return acc
	},
	{},
)

export default class extends ToolView {
	static title = "Date & Time"

	input: Stream<string> = Stream("")
	result: Stream<null | Result> = this.input.map(parseDate)

	mainView(): m.Children {
		return [
			m("form.my-3", [
				m(Input, {
					placeholder: "Enter your date/time in any format, including seconds-since-epoch",
					model: this.input,
				}),
			]),
			this.result()?.view(),
			m("h3", "Examples"),
			m(
				"ul",
				{
					onclick: (event: MouseEvent) => {
						if (event.target instanceof HTMLAnchorElement) {
							event.preventDefault()
							this.input(event.target.innerText)
						}
					},
				},
				[
					"today",
					"8h ago",
					"4d ago",
					"2w ago",
					"2d after",
					"9:30am in Mumbai",
					"10pm in Paris",
					"5mins",
					"5m to s",
				].map(c => m("li", m("a", { href: "#" }, c))),
			),
		]
	}

}

class OutputRow implements m.ClassComponent<{ label: m.Children, value: unknown }> {
	view(vnode: m.Vnode<{ label: m.Children, value: unknown }>): m.Children {
		return m("tr", [
			m("th", vnode.attrs.label),
			m("td", m(".hstack.gap-2", [
				m(CopyButton, { content: vnode.attrs.value }),
				m("span.me-2", String(vnode.attrs.value)),
			])),
		])
	}
}

export function parseDate(input: string): null | Result {
	input = input.trim()
	if (input === "") {
		return null
	}

	const inputLower = input.toLowerCase()
	let match

	if (inputLower === "today" || inputLower === "now") {
		return new DateTimePointResult(new Date)
	}

	if (input.match(/^\d+$/) && input.length === 10) {
		// Seconds since epoch.
		return new DateTimePointResult(new Date(parseInt(input, 10) * 1000))
	}

	if (input.match(/^\d+$/) && input.length === 13) {
		// Milliseconds since epoch.
		return new DateTimePointResult(new Date(parseInt(input, 10)))
	}

	if ((match = inputLower.match(/^(\d+)\s*([a-z]+)\s+(ago|later|after)$/))) {
		const count = parseInt(match[1], 10)
		const unit = match[2]
		const direction = match[3] === "ago" ? -1 : 1
		const delta = count * direction

		const date = new Date()

		if (unit.startsWith("w")) {
			date.setDate(date.getDate() + delta * 7)

		} else if (unit.startsWith("d")) {
			date.setDate(date.getDate() + delta)

		} else if (unit.startsWith("h")) {
			date.setHours(date.getHours() + delta)

		}

		return new DateTimePointResult(date)
	}

	if ((match = inputLower.match(/^(\d\d?)(?::(\d\d))?(?:\s*([ap]m))?\s*in\s*([a-z\s]+)$/))) {
		const [_ignored, hour, minute, meridian, city] = match
		const zone = CITY_TO_ZONE[city.replace(/_|\s/g, "").toLowerCase()]
		const d = new Date()
		d.setUTCHours((meridian === "pm" ? 12 : 0) + parseInt(hour, 10))
		d.setUTCMinutes(parseInt(minute ?? 0, 10))
		d.setUTCSeconds(0)
		d.setUTCMilliseconds(0)
		let match1 = Intl.DateTimeFormat([], {
			timeZoneName: "longOffset",
			timeZone: zone,
		}).format(d).match(/GMT([-+])(\d\d):(\d\d)/)
		if (match1 != null) {
			const [_ignored2, sign, offsetHours, offsetMinutes] = match1
			const signum = sign === "-" ? 1 : -1
			d.setUTCHours(d.getUTCHours() + signum * parseInt(offsetHours, 10))
			d.setUTCMinutes(d.getUTCMinutes() + signum * parseInt(offsetMinutes, 10))
		}
		return new DateTimePointResult(d)
	}

	if ((match = inputLower.match(/^([\d.]+)\s*([a-z]+)$/))) {
		const [_, countStr, unit] = match
		const count: number = parseInt(countStr, 10)
		return new DurationResult(count, unit)
	}

	if ((match = inputLower.match(/^([\d.]+)\s*([a-z]+)\s+to\s+([a-z]+)$/))) {
		let [_, inCountStr, inUnit, outUnit] = match
		const inCount = parseInt(inCountStr, 10)

		inUnit = normalizeTimeUnit(inUnit)
		outUnit = normalizeTimeUnit(outUnit)

		let factor = 1

		if (inUnit === "d") {
			factor *= 24 * 60 * 60 * 1000
		}
		if (inUnit === "h") {
			factor *= 60 * 60 * 1000
		}
		if (inUnit === "m") {
			factor *= 60 * 1000
		}
		if (inUnit === "s") {
			factor *= 1000
		}

		if (outUnit === "s") {
			factor /= 1000
		}
		if (outUnit === "m") {
			factor /= 60 * 1000
		}
		if (outUnit === "h") {
			factor /= 60 * 60 * 1000
		}
		if (outUnit === "d") {
			factor /= 24 * 60 * 60 * 1000
		}

		if (inUnit !== "" && outUnit !== "") {
			return new UnitConversionResult(inCount, inUnit, inCount * factor, outUnit)
		}
	}

	const date = new Date(input)
	return isNaN(date.getTime()) ? null : new DateTimePointResult(date)
}

function normalizeTimeUnit(unit: string): string {
	if (unit === "ms" || (unit !== "m" && "milliseconds".startsWith(unit))) {
		return "ms"
	} else if ("secs" === unit || "seconds".startsWith(unit)) {
		return "s"
	} else if ("mins" === unit || "minutes".startsWith(unit)) {
		return "m"
	} else if ("hs" === unit || "hrs".startsWith(unit) || "hours".startsWith(unit)) {
		return "h"
	} else if ("ds" === unit || "days".startsWith(unit)) {
		return "d"
	} else if ("ws" === unit || "wks".startsWith(unit) || "weeks".startsWith(unit)) {
		return "w"
	} else {
		return ""
	}
}
