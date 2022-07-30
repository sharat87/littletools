import { format } from "../scripts/tools/json"

test("json format object", () => {
	let value = { a: 1, b: 2 }
	expect(format(JSON.stringify(value))).toBe(JSON.stringify(value, null, 4))
})
