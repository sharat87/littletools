import { parseCIDRBlock } from "~src/tools/cidr"

function conflictCheck(cidr1: string, cidr2: string) {
	return parseCIDRBlock(cidr1).isConflicting(parseCIDRBlock(cidr2))
}

test("superset checks", () => {
	expect(conflictCheck("abcd::f:1:2/30", "abcd::f:1:2/32")).toBe("superset")
	expect(conflictCheck("abcd::f:1:2/0", "abcd::f:1:2/32")).toBe("superset")
	expect(conflictCheck("abcd::f:1:2/100", "abcd::f:1:2/128")).toBe("superset")
})

test("subset checks", () => {
	expect(conflictCheck("abcd::f:1:2/32", "abcd::f:1:2/30")).toBe("subset")
	expect(conflictCheck("abcd::f:1:2/32", "abcd::f:1:2/0")).toBe("subset")
	expect(conflictCheck("abcd::f:1:2/128", "abcd::f:1:2/100")).toBe("subset")
})

test("no conflict checks", () => {
	expect(conflictCheck("abcd::f:1:2/32", "fbcd::f:1:2/30")).toBeNull()
})
