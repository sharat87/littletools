import { parseCIDRBlock } from "~src/tools/cidr"

const includesChecks: [cidr: string, address: string][] = [
	["abcd::f:1:2/32", "abcd::f:1:2"],
	["abcd::f:1:2/32", "abcd::::"],
	["abcd::f:1:2/32", "abcd:::ffff:ffff"],
]

test.each(includesChecks)("%s includes %s", (cidr: string, address: string) => {
	expect(parseCIDRBlock(cidr).includes(address)).toBe(true)
})

const includesFailChecks: [cidr: string, address: string][] = [
	["abcd::f:1:2/32", "bcd::f:1:2"],
	["abcd::f:1:2/32", "abcd:1:::"],
]

test.each(includesFailChecks)("%s doesn't include %s", (cidr: string, address: string) => {
	expect(parseCIDRBlock(cidr).includes(address)).toBe(false)
})
