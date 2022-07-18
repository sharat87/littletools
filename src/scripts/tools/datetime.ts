import m from "mithril"
import Stream from "mithril/stream"
import { CopyButton, Input } from "../components"

export default {
	title: "Date time formats",
	oninit,
	view,
}

interface State {
	input: Stream<string>
	date: Stream<null | Date>
}

function oninit() {
	this.input = Stream("")
	this.date = this.input.map(parseDate)
}

function view() {
	const exLink = (content: string): m.Children => {
		return m("li", m("a", {
			href: "#",
			onclick: (event: MouseEvent) => {
				event.preventDefault()
				this.input(content)
			},
		}, content))
	}

	const date = this.date()

	return m(".container", [
		m("h1", "Date time formats"),
		m("form.mb-3", [
			m("label", {
				for: "dateInput",
				class: "form-label",
			}, "Enter your date/time in any format, including seconds-since-epoch:"),
			m(Input, {
				class: "form-control",
				id: "dateInput",
				model: this.input,
			}),
		]),
		date != null && m("table", [
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
		]),
		m("h3", "Some Examples"),
		m("ul", [
			exLink("today"),
			exLink("8h ago"),
			exLink("4d ago"),
			exLink("2w ago"),
			exLink("2d after"),
		]),
	])
}

class OutputRow {
	view(vnode: m.Vnode<{ label: m.Children, value: unknown }>) {
		return m("tr", [
			m("td", vnode.attrs.label),
			m("td", String(vnode.attrs.value)),
			m("td", m(CopyButton, { content: vnode.attrs.value })),
		])
	}
}

function parseDate(input: string): null | Date {
	input = input.trim()
	if (input === "") {
		return null
	}

	const inputLower = input.toLowerCase()
	let match

	if (inputLower === "today" || inputLower === "now") {
		return new Date()
	}

	if (input.match(/^\d+$/) && input.length === 10) {
		// Seconds since poch.
		return new Date(parseInt(input, 10) * 1000)
	}

	if (input.match(/^\d+$/) && input.length === 13) {
		// Milliseconds since epoch.
		return new Date(parseInt(input, 10))
	}

	if ((match = inputLower.match(/^(\d+)\s*(h(ours?)?|d(ays?)?|w(eeks?)?)\s+(ago|later|after)$/))) {
		const count = parseInt(match[1], 10)
		const unit = match[2]
		const direction = match[5] === "ago" ? -1 : 1
		const delta = count * direction

		const date = new Date()

		if (unit.startsWith("w")) {
			date.setDate(date.getDate() + delta * 7)

		} else if (unit.startsWith("d")) {
			date.setDate(date.getDate() + delta)

		} else if (unit.startsWith("h")) {
			date.setHours(date.getHours() + delta)

		}

		return date
	}

	const date = new Date(input)
	return isNaN(date.getTime()) ? null : date
}
