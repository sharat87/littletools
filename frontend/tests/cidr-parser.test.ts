import { CIDRBlock4, CIDRBlock6, parseCIDRBlock } from "~src/tools/cidr"

test("parse 172.168.0.1/16", () => {
	const block = parseCIDRBlock("172.168.0.1/16")
	expect(block).toBeInstanceOf(CIDRBlock4)
	if (!(block instanceof CIDRBlock4)) return
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

test("parse 10.0.200.8/32", () => {
	const block = parseCIDRBlock("10.0.200.8/32")
	expect(block).toBeInstanceOf(CIDRBlock4)
	if (!(block instanceof CIDRBlock4)) return
	expect(block.n1).toEqual(10)
	expect(block.n2).toEqual(0)
	expect(block.n3).toEqual(200)
	expect(block.n4).toEqual(8)
	expect(block.reservedBitCount).toEqual(32)
	expect(block.bits.join("")).toEqual("00001010000000001100100000001000")
	expect(block.addressCount).toEqual(1)
	expect(block.firstAddress).toEqual("10.0.200.8")
	expect(block.lastAddress).toEqual("10.0.200.8")
})

test("parse a:b:c:d:e:f:1:2/32", () => {
	const block = parseCIDRBlock("a:b:c:d:e:f:1:2/32")
	expect(block).toBeInstanceOf(CIDRBlock6)
	if (!(block instanceof CIDRBlock6)) return
	expect(Array.from(block.typedArray).map((n) => n.toString(16)))
		.toEqual(["a", "b", "c", "d", "e", "f", "1", "2"])
	expect(block.reservedBitCount).toEqual(32)
})

test("parse a:b::f:1:2/32", () => {
	const block = parseCIDRBlock("a:b::f:1:2/64")
	expect(block).toBeInstanceOf(CIDRBlock6)
	if (!(block instanceof CIDRBlock6)) return
	expect(Array.from(block.typedArray).map((n) => n.toString(16)))
		.toEqual(["a", "b", "0", "0", "0", "f", "1", "2"])
	expect(block.reservedBitCount).toEqual(64)
})

test("parse abcd::f:1:2/32", () => {
	const block = parseCIDRBlock("abcd::f:1:2/32")
	expect(block).toBeInstanceOf(CIDRBlock6)
	if (!(block instanceof CIDRBlock6)) return
	expect(Array.from(block.typedArray).map((n) => n.toString(16)))
		.toEqual(["abcd", "0", "0", "0", "0", "f", "1", "2"])
	expect(block.reservedBitCount).toEqual(32)
})
