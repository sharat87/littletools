import { explain, numSuffix } from "../scripts/tools/cron"

const cronCases: [expression: string, explanation: string][] = [
	["* * * * *", "every minute"],
	["0 6 * * *", "every day at 6:00 AM"],
	["0 12 * * *", "every day at 12:00 Noon"],
	["0 16 * * *", "every day at 4:00 PM"],
	["0 6 2 * *", "every month on 2nd at 6:00 AM"],
	["15 10 ? * *", "every day at 10:15 AM"],
	["15 10 * * ?", "every day at 10:15 AM"],
	["0 15 10 * * ? *", "every day at 10:15 AM"],
	["0 15 10 * * ? 2005", "every day at 10:15 AM during the year 2005"],
	["* 14 * * ?", "every minute starting at 2:00 PM and ending at 2:59 PM, every day"],
	["0/5 14 * * ?", "every 5 minutes starting at 2:00 PM and ending at 2:55 PM, every day"],
	["0/5 14,18 * * ?", "every 5 minutes starting at 2:00 PM and ending at 2:55 PM, AND every 5 minutes starting at 6:00 PM and ending at 6:55 PM, every day"],
	// ["0-5 14 * * ?", "every minute starting at 2:00 PM and ending at 2:05 PM, every day"],
	// ["10,44 14 ? 3 WED", " 2:10 PM and at 2:44 PM every Wednesday in the month of March"],
	// ["15 10 ? * MON-FRI", " 10:15 AM every Monday, Tuesday, Wednesday, Thursday and Friday"],
	// ["15 10 15 * ?", " 10:15 AM on the 15th day of every month"],
	// ["15 10 L * ?", " 10:15 AM on the last day of every month"],
	// ["15 10 ? * 6L", " 10:15 AM on the last Friday of every month"],
	// ["15 10 ? * 6L", " 10:15 AM on the last Friday of every month"],
	// ["15 10 ? * 6L 2002-2005", " 10:15 AM on every last friday of every month during the years 2002, 2003, 2004, and 2005"],
	// ["15 10 ? * 6#3", " 10:15 AM on the third Friday of every month"],
	// ["0 12 1/5 * ?", " 12 PM (noon) every 5 days every month, starting on the first day of the month"],
	// ["11 11 11 11 ?", "every November 11 at 11:11 AM"],
]

test.each(cronCases)('%s -> %s', (expression: string, explanation: string) => {
	expect(explain(expression)).toBe(explanation)
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
