import { numSuffix } from "~src/utils"

const numSuffixCases = [
	["1", "st"],
	["2", "nd"],
	["3", "rd"],
	["4", "th"],
	["5", "th"],
	["10", "th"],
	["11", "th"],
	["12", "th"],
	["13", "th"],
	["14", "th"],
	["15", "th"],
]

test.each(numSuffixCases)("%s%s", (n: string, suffix: string) => {
	expect(numSuffix(n)).toBe(suffix)
})
