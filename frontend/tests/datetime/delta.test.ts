import { parseDate } from "~src/tools/datetime"

const cases: [input: string, changeFn: (d: Date) => unknown][] = [
	["8h ago", d => d.setHours(d.getHours() - 8)],
	["10d ago", d => d.setDate(d.getDate() - 10)],
	["3w ago", d => d.setDate(d.getDate() - 21)],
]

test.each(cases)("%s", (input: string, changeFn: ((d: Date) => unknown)) => {
	let got = parseDate(input)
	expect(got?.toDate).not.toBeNull()
	const want = new Date
	changeFn(want)
	expect(got?.toDate?.getTime()).toEqual(want.getTime())
})
