import { parseDate } from "../scripts/tools/datetime"

test("today", () => {
	let d = parseDate("8h ago")
	expect(d).not.toBeNull()
	expect(Date.now() - d!.valueOf()).toBe(3600000)
})
