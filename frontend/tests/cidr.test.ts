import { CIDRBlock } from "~src/tools/cidr"

test("parse 172.168.0.1/16", () => {
	const block = new CIDRBlock("172.168.0.1/16")
	expect(block.n1).toEqual(172)
	expect(block.n2).toEqual(168)
	expect(block.n3).toEqual(0)
	expect(block.n4).toEqual(1)
	expect(block.reservedBitCount).toEqual(16)
	expect(block.bits.join("")).toEqual("10101100101010000000000000000001")
	expect(block.addressCount).toEqual(65_536)
	expect(block.firstAddress).toEqual("172.168.0.0")
	expect(block.lastAddress).toEqual("172.168.255.255")
})
