import m from "mithril"
import Stream from "mithril/stream"
import { Input, Textarea, ToolView } from "../components"
import { padLeft } from "../utils"

// TODO: Overlap checker: Take a list of CIDR blocks and check if any of them overlap.
// TODO: Export full list of all IP addresses in the CIDR block. Copy or download.

interface ParsedExpression {
	n1: number
	n2: number
	n3: number
	n4: number
	bits: number[]
	reservedBitCount: number
}

function computeFirstAddressInCIDRBlock(block: ParsedExpression): string {
	const bits: number[] = Array.from(block.bits)
	for (let i = block.reservedBitCount; i < 32; ++i) {
		bits[i] = 0
	}
	return bitArrayToAddress(bits)
}

function computeLastAddressInCIDRBlock(block: ParsedExpression): string {
	const bits: number[] = Array.from(block.bits)
	for (let i = block.reservedBitCount; i < 32; ++i) {
		bits[i] = 1
	}
	return bitArrayToAddress(bits)
}

function bitArrayToAddress(bits: number[]): string {
	return [
		parseInt(bits.slice(0, 8).join(""), 2),
		parseInt(bits.slice(8, 16).join(""), 2),
		parseInt(bits.slice(16, 24).join(""), 2),
		parseInt(bits.slice(24, 32).join(""), 2),
	].join(".")
}

function parseAddress(address: string): ParsedExpression {
	const match = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/)
	if (match == null) {
		throw new Error(`Invalid address: ${ address }`)
	}

	const [_, n1Str, n2Str, n3Str, n4Str, reservedBitCountStr] = match

	const n1 = parseInt(n1Str, 10)
	const n2 = parseInt(n2Str, 10)
	const n3 = parseInt(n3Str, 10)
	const n4 = parseInt(n4Str, 10)

	const reservedBitCount = reservedBitCountStr == null ? 32 : parseInt(reservedBitCountStr, 10)

	const bits: number[] = [
		...decimalToBinaryBits(n1),
		...decimalToBinaryBits(n2),
		...decimalToBinaryBits(n3),
		...decimalToBinaryBits(n4),
	]

	return { n1, n2, n3, n4, bits, reservedBitCount }
}

function decimalToBinaryBits(num: number): number[] {
	return padLeft(num.toString(2), "0", 8).split("").map(c => parseInt(c, 2))
}

function ipToBigInt(ip: string): bigint {
	return BigInt("0b" + ip.split(".").map(n => padLeft(parseInt(n, 10).toString(2), "0", 8)).join(""))
}

function bigIntToIp(n: bigint): string {
	const allBits = n.toString(2)
	return [
		parseInt(allBits.slice(0, 8), 2),
		parseInt(allBits.slice(8, 16), 2),
		parseInt(allBits.slice(16, 24), 2),
		parseInt(allBits.slice(24, 32), 2),
	].join(".")
}

function blockToBigIntRange(block: ParsedExpression): [bigint, bigint] {
	const firstAddress = computeFirstAddressInCIDRBlock(block)
	const lastAddress = computeLastAddressInCIDRBlock(block)
	return [ipToBigInt(firstAddress), ipToBigInt(lastAddress)]
}

function checkCIDRConflicts(input: string): string[] {
	const cidrBlocks: string[] = Array.from(input.matchAll(/(\d+\.){3}\d+\/\d+/g)).map(m => m[0])
	console.log("Checking CIDR blocks:", cidrBlocks)

	const rangesByBlock: Record<string, [bigint, bigint]> = Object.fromEntries(
		cidrBlocks.map(block => [block, blockToBigIntRange(parseAddress(block))]),
	)

	const conflicts: string[] = []
	for (let i = 0; i < cidrBlocks.length; ++i) {
		const [from1, to1] = rangesByBlock[cidrBlocks[i]]
		const block1 = parseAddress(cidrBlocks[i])
		for (let j = i + 1; j < cidrBlocks.length; ++j) {
			const [from2, to2] = rangesByBlock[cidrBlocks[j]]
			const block2 = parseAddress(cidrBlocks[j])
			if (to1 > from2) {
				conflicts.push(`${ cidrBlocks[i] } (${ computeFirstAddressInCIDRBlock(block1) } - ${ computeLastAddressInCIDRBlock(block1) }) overlaps with ${ cidrBlocks[j] } (${ computeFirstAddressInCIDRBlock(block2) } - ${ computeLastAddressInCIDRBlock(block2) })`)
			} else if (to2 > from1) {
				conflicts.push(`${ cidrBlocks[j] } (${ computeFirstAddressInCIDRBlock(block2) } - ${ computeLastAddressInCIDRBlock(block2) }) overlaps with ${ cidrBlocks[i] } (${ computeFirstAddressInCIDRBlock(block1) } - ${ computeLastAddressInCIDRBlock(block1) })`)
			}
		}
	}

	return conflicts
}

export default class extends ToolView {
	static title = "CIDR Block Tester"

	private readonly expression: Stream<string> = Stream("172.168.0.1/16")
	private readonly parsedExpression: Stream<ParsedExpression> = this.expression.map(parseAddress)
	private readonly firstAddress: Stream<string> = this.parsedExpression.map(computeFirstAddressInCIDRBlock)
	private readonly lastAddress: Stream<string> = this.parsedExpression.map(computeLastAddressInCIDRBlock)
	private readonly countAddresses: Stream<number> = this.parsedExpression.map(({ reservedBitCount }) => {
		return reservedBitCount < 0 || reservedBitCount > 32 ? -1 : Math.pow(2, 32 - reservedBitCount)
	})

	private readonly checkAddress: Stream<string> = Stream("")
	private readonly isCheckAddressInBlock: Stream<boolean> = Stream.lift((parsedExpression, checkAddress) => {
		if (checkAddress === "") {
			return true
		}

		let address
		try {
			address = parseAddress(checkAddress)
		} catch (err) {
			return false
		}

		for (let i = parsedExpression.reservedBitCount; i--;) {
			if (address.bits[i] !== parsedExpression.bits[i]) {
				return false
			}
		}

		return true
	}, this.parsedExpression, this.checkAddress)

	private readonly conflictCheckInput: Stream<string> = Stream("172.168.0.1/16\n172.168.10.1/24\n")

	mainView(): m.Children {
		return [
			m("input.form-control.font-monospace", {
				style: {
					width: "20ch",
					fontSize: "2em",
				},
				placeholder: "CIDR Block",
				value: this.expression(),
				oninput: (event: InputEvent) => {
					this.expression((event.target as HTMLInputElement).value)
				},
			}),
			m("p", [
				"Describes ",
				m("code", this.countAddresses()),
				" addresses, starting from ",
				m("code", this.firstAddress()),
				" to ",
				m("code", this.lastAddress()),
				".",
			]),
			m(BitsDisplay, {
				address: this.parsedExpression(),
			}),
			m(".row.d-flex.align-items-center", [
				m(".col-auto", m("label", { for: "checkInput" }, "Check if address falls in this block: ")),
				m(".col-auto", m(Input, {
					id: "checkInput",
					class: this.isCheckAddressInBlock() ? (this.checkAddress() === "" ? "" : "is-valid") : "is-invalid",
					model: this.checkAddress,
				})),
			]),
			m("hr"),
			m("h2.mt-0", "Check for conflicts"),
			m(Textarea, {
				placeholder: "Enter CIDR blocks to check for conflicts",
				model: this.conflictCheckInput,
				class: "font-monospace",
			}),
			checkCIDRConflicts(this.conflictCheckInput()).map(conflict => m("p", conflict)),
		]
	}
}

class BitsDisplay implements m.ClassComponent<{ address: ParsedExpression }> {
	view(vnode: m.Vnode<{ address: ParsedExpression }>): m.Children {
		const { n1, n2, n3, n4, bits, reservedBitCount } = vnode.attrs.address
		const unitSize = 1.1
		return m(".card", m("pre.card-body.fs-4.mb-0", [
			bits.map((bit: number, i: number) => {
				return m(
					"span.d-inline-flex.align-items-center.justify-content-center",
					{
						style: {
							width: unitSize + "em",
							lineHeight: unitSize + "em",
						},
						class: [
							i > 0 && i % 8 === 0 ? "ms-4" : "",
							i < reservedBitCount ? "bg-danger bg-opacity-25" : "", // reserved bits
						].join(" "),
					},
					bit,
				)
			}),
			"\n",
			[n1, n2, n3, n4].map((n: number, i: number) => m(
				"span.d-inline-flex.align-items-center.justify-content-center",
				{
					style: {
						width: (unitSize * 8) + "em",
						lineHeight: unitSize + "em",
					},
					class: i > 0 ? "ms-4" : "",
				},
				n,
			)),
		]))
	}
}
