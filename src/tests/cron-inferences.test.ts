import { computeEffectiveMonthsFromSpec, computeEffectiveWeekdaysFromSpec, infer } from "../scripts/tools/cron"

const cronCases: Record<string, string[]> = {
	"* * * * *": [
		"Every minute",
		"Every day",
		"Every month",
	],
	"0 * * * *": [
		"Every hour, at *:00",
		"Every day",
		"Every month",
	],
	"* 1 * * *": [
		"Every minute, from 1:00 AM to 1:59 AM",
		"Every day",
		"Every month",
	],
	"0 6 * * *": [
		"At 6:00 AM",
		"Every day",
		"Every month",
	],
	"0 6 2 * *": [
		"At 6:00 AM",
		"Dated: 2nd",
		"Every month",
	],
	"0 6 2,3 * *": [
		"At 6:00 AM",
		"Dated: 2nd, and 3rd",
		"Every month",
	],
	"0 6 2,3,4 * *": [
		"At 6:00 AM",
		"Dated: 2nd, 3rd, and 4th",
		"Every month",
	],
	"0 6 2-10 * *": [
		"At 6:00 AM",
		"Dated: 2nd to 10th",
		"Every month",
	],
	"0 6 1,4-10 * *": [
		"At 6:00 AM",
		"Dated: 1st, and 4th to 10th",
		"Every month",
	],
	"* * * 1 *": [
		"Every minute",
		"Every day",
		"During: January",
	],
	"* * * 3 *": [
		"Every minute",
		"Every day",
		"During: March",
	],
	"* * * 1,3,5 *": [
		"Every minute",
		"Every day",
		"During: January, March, and May",
	],
	"* * * 1-3 *": [
		"Every minute",
		"Every day",
		"During: January to March",
	],
	"* * * 1-3,12 *": [
		"Every minute",
		"Every day",
		"During: January to March, and December",
	],
}

test.each(Object.entries(cronCases))("%s -> %s", (input: string, inferences: string[]) => {
	expect(infer(input).map((i) => i.message)).toEqual(inferences)
})

const monthCases: Record<string, string[]> = {
	"1": [
		"January",
	],
	"3": [
		"March",
	],
	"11": [
		"November",
	],
	"12": [
		"December",
	],
	"1-3": [
		"January to March",
	],
	"8-11": [
		"August to November",
	],
	"1,3,5": [
		"January",
		"March",
		"May",
	],
	"1,3-5,8": [
		"January",
		"March to May",
		"August",
	],
	"JAN": [
		"January",
	],
	"SEP": [
		"September",
	],
	"MAR-AUG": [
		"March to August",
	],
}

test.each(Object.entries(monthCases))("%s -> %s", (input: string, inferences: string[]) => {
	expect(computeEffectiveMonthsFromSpec(input)).toEqual(inferences)
})

test("computeEffectiveMonthsFromSpec: invalid input", () => {
	expect(() => computeEffectiveMonthsFromSpec("")).toThrow()
	expect(() => computeEffectiveMonthsFromSpec("6-2")).toThrow(/\b6-2\b/)
	expect(() => computeEffectiveMonthsFromSpec("SEP-FEB")).toThrow(/\bSEP-FEB\b/)
})

const weekdayCases: Record<string, string[]> = {
	"0": [
		"Sunday",
	],
	"2": [
		"Tuesday",
	],
	"2,5": [
		"Tuesday",
		"Friday",
	],
	"2-4": [
		"Tuesday",
		"Wednesday",
		"Thursday",
	],
	"SAT": [
		"Saturday",
	],
	"TUE-FRI": [
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
	],
}

test.each(Object.entries(weekdayCases))("%s -> %s", (input: string, inferences: string[]) => {
	expect(computeEffectiveWeekdaysFromSpec(input)).toEqual(inferences)
})

test("computeEffectiveWeekdaysFromSpec: invalid input", () => {
	expect(() => computeEffectiveWeekdaysFromSpec("")).toThrow()
	expect(() => computeEffectiveWeekdaysFromSpec("6-2")).toThrow(/\b6-2\b/)
	expect(() => computeEffectiveWeekdaysFromSpec("THU-MON")).toThrow(/\bTHU-MON\b/)
})
