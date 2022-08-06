import { parseDate } from "../src/tools/datetime"

test("today", () => {
	let d = parseDate("8h ago")
	expect(d).not.toBeNull()
	expect(d.toDate).not.toBeNull()
	expect(3600000 - Math.abs(Date.now() - d!.toDate!.valueOf())).toBeLessThan(5)
})
