import { parseDate } from "~src/tools/datetime"

test("10pm in Paris", () => {
	let d = parseDate("10pm in Paris")
	expect(d?.toDate).not.toBeNull()
	expect(d.toDate?.getUTCHours()).toEqual(20)
	expect(d.toDate?.getUTCMinutes()).toEqual(0)
})

test("5:40am in Mumbai", () => {
	let d = parseDate("5:40am in Kolkata")
	expect(d?.toDate).not.toBeNull()
	expect(d.toDate?.getUTCHours()).toEqual(0)
	expect(d.toDate?.getUTCMinutes()).toEqual(10)
})
