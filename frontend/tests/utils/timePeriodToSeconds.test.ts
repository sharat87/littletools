import { timePeriodToSeconds } from "~src/utils"

test("time period check", () => {
	expect(timePeriodToSeconds("1")).toEqual(1)
	expect(timePeriodToSeconds("40")).toEqual(40)
	expect(timePeriodToSeconds("5s")).toEqual(5)
	expect(timePeriodToSeconds("500s")).toEqual(500)

	expect(timePeriodToSeconds("1m")).toEqual(60)
	expect(timePeriodToSeconds("10m")).toEqual(600)
	expect(timePeriodToSeconds("10m5s")).toEqual(605)
	expect(timePeriodToSeconds("1h10m5s")).toEqual(4205)

	expect(timePeriodToSeconds("1:00")).toEqual(60)
	expect(timePeriodToSeconds("10:00")).toEqual(600)
	expect(timePeriodToSeconds("10:05")).toEqual(605)
	expect(timePeriodToSeconds("1:10:05")).toEqual(4205)

	expect(timePeriodToSeconds("1.4")).toEqual(1.4)
	expect(timePeriodToSeconds("5.009s")).toEqual(5.009)
	expect(timePeriodToSeconds("3m10.7s")).toEqual(190.7)
})
