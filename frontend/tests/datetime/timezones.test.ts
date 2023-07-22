import { DateTimePointResult, parseDate } from "~src/tools/datetime"

// TODO: Figure out why these tests fail on CI.

xtest("10pm in Paris", () => {
	const d = parseDate("10pm in Paris") as DateTimePointResult
	expect(d).toBeInstanceOf(DateTimePointResult)
	expect(d.dateTime).not.toBeNull()
	expect(d.dateTime.getUTCHours()).toEqual(20)
	expect(d.dateTime.getUTCMinutes()).toEqual(0)
})

xtest("5:40am in Mumbai", () => {
	const d = parseDate("5:40am in Kolkata") as DateTimePointResult
	expect(d).toBeInstanceOf(DateTimePointResult)
	expect(d.dateTime).not.toBeNull()
	expect(d.dateTime.getUTCHours()).toEqual(0)
	expect(d.dateTime.getUTCMinutes()).toEqual(10)
})
