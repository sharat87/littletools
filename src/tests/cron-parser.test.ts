import { translateToEnglish, numSuffix } from "../scripts/tools/cron-parser"

const cronCases = [
	["* * * * *", "every minute"],
	["0 6 * * *", "every day at 06:00"],
	["0 6 2 * *", "every month on 2nd at 06:00"],
]

test.each(cronCases)('%s -> %s', (expression: string, english: string) => {
	expect(translateToEnglish(expression)).toBe(english)
})

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

test.each(numSuffixCases)('%s%s', (n: string, suffix: string) => {
	expect(numSuffix(n)).toBe(suffix)
})
