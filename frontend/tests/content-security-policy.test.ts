import { parseCSP } from "~src/tools/content-security-policy"

test("single value script-src", () => {
	expect(parseCSP("script-src 'self';")).toEqual({
		"script-src": "'self'",
	})

	expect(parseCSP("script-src *;")).toEqual({
		"script-src": "*",
	})

	expect(parseCSP("script-src 'unsafe-inline';")).toEqual({
		"script-src": "'unsafe-inline'",
	})
})

test("multiple values for script-src", () => {
	expect(parseCSP("script-src 'self' 'unsafe-inline' 'unsafe-eval';")).toEqual({
		"script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
	})
})
