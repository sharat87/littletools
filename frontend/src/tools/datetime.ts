import m from "mithril"
import Stream from "mithril/stream"
import { CopyButton, Input, ToolView } from "~/src/components"
import { numSuffix, padLeft } from "../utils"

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

	input = Stream("")
	fromDate: Stream<null | Date> = Stream(null)
	toDate: Stream<null | Date> = Stream(null)

	constructor() {
		super()
		this.input.map(this.parseInput.bind(this))
	}

	mainView(): m.Children {
		const exLink = (content: string): m.Children => {
			return m("li", m("a", {
				href: "#",
				onclick: (event: MouseEvent) => {
					event.preventDefault()
					this.input(content)
				},
			}, content))
		}

		const date = this.toDate()

		return [
			m("form.my-3", [
				m(Input, {
					placeholder: "Enter your date/time in any format, including seconds-since-epoch",
					model: this.input,
				}),
			]),
			date != null && m("p.fs-2", [
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
			date != null && m("table.table.table-bordered.table-hover.align-middle", m("tbody", [
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
			m("h3", "Examples"),
			m("ul", [
				exLink("today"),
				exLink("8h ago"),
				exLink("4d ago"),
				exLink("2w ago"),
				exLink("2d after"),
				exLink("9:30am in Mumbai"),
				exLink("10pm in Paris"),
			]),
		]
	}

	parseInput() {
		let { fromDate, toDate } = parseDate(this.input())
		this.fromDate(fromDate ?? null)
		this.toDate(toDate ?? null)
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

export function parseDate(input: string): { fromDate?: Date, toDate?: null | Date } {
	input = input.trim()
	if (input === "") {
		return {}
	}

	const inputLower = input.toLowerCase()
	let match

	if (inputLower === "today" || inputLower === "now") {
		return { toDate: new Date() }
	}

	if (input.match(/^\d+$/) && input.length === 10) {
		// Seconds since epoch.
		return { toDate: new Date(parseInt(input, 10) * 1000) }
	}

	if (input.match(/^\d+$/) && input.length === 13) {
		// Milliseconds since epoch.
		return { toDate: new Date(parseInt(input, 10)) }
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

		return { toDate: date }
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
		return { toDate: d }
	}

	const date = new Date(input)
	return { toDate: isNaN(date.getTime()) ? null : date }
}
