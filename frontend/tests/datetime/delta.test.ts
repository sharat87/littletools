import { DateTimePointResult, parseDate } from "~src/tools/datetime"

const cases: [input: string, changeFn: (d: Date) => unknown][] = [
	["8h ago", d => d.setHours(d.getHours() - 8)],
	["10d ago", d => d.setDate(d.getDate() - 10)],
	["3w ago", d => d.setDate(d.getDate() - 21)],
]

test.each(cases)("%s", (input: string, changeFn: ((d: Date) => unknown)) => {
	const got = parseDate(input) as DateTimePointResult
	expect(got).toBeInstanceOf(DateTimePointResult)
	expect(got.dateTime).not.toBeNull()
	const want = new Date
	changeFn(want)
	expect(got.dateTime.getTime()).toEqual(want.getTime())
})
