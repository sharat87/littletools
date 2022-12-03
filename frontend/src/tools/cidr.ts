import m from "mithril"
import Stream from "mithril/stream"
import { Input, Textarea, ToolView } from "../components"
import { padLeft } from "../utils"

// TODO: Export full list of all IP addresses in the CIDR block. Copy or download.

export class CIDRBlock {
	n1: number = 0
	n2: number = 0
	n3: number = 0
	n4: number = 0
	reservedBitCount: number = 0
	bits: number[] = []
	addressCount: number = 0
	firstAddress: string = ""
	lastAddress: string = ""

	constructor(private readonly expression: string) {
		const match = this.expression.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/)
		if (match == null) {
			throw new Error(`Invalid address: ${ this.expression }`)
		}

		const [_, n1Str, n2Str, n3Str, n4Str, reservedBitCountStr] = match

		this.n1 = parseInt(n1Str, 10)
		this.n2 = parseInt(n2Str, 10)
		this.n3 = parseInt(n3Str, 10)
		this.n4 = parseInt(n4Str, 10)

		this.reservedBitCount = reservedBitCountStr == null ? 32 : parseInt(reservedBitCountStr, 10)

		this.bits = [
			...decimalToBinaryBits(this.n1),
			...decimalToBinaryBits(this.n2),
			...decimalToBinaryBits(this.n3),
			...decimalToBinaryBits(this.n4),
		]

		this.addressCount = this.reservedBitCount < 0 || this.reservedBitCount > 32 ? -1 : Math.pow(2, 32 - this.reservedBitCount)

		this.firstAddress = this.computeFirstAddressInCIDRBlock()
		this.lastAddress = this.computeLastAddressInCIDRBlock()
	}

	checkConflictWith(other: CIDRBlock): null | string {
		const [from1, to1] = this.bigIntRange()
		const [from2, to2] = other.bigIntRange()

		if (from2 > from1 && to2 < to1) {
			return `${ this.expression } contains ${ other.expression }`
		} else if (from1 > from2 && to1 < to2) {
			return `${ other.expression } contains ${ this.expression }`
		} else if (to1 > from2) {
			return `${ this.expression } (${ this.computeFirstAddressInCIDRBlock() } - ${ this.computeLastAddressInCIDRBlock() }) overlaps with ${ other.expression } (${ other.computeFirstAddressInCIDRBlock() } - ${ other.computeLastAddressInCIDRBlock() })`
		} else if (to2 > from1) {
			return `${ other.expression } (${ other.computeFirstAddressInCIDRBlock() } - ${ other.computeLastAddressInCIDRBlock() }) overlaps with ${ this.expression } (${ this.computeFirstAddressInCIDRBlock() } - ${ this.computeLastAddressInCIDRBlock() })`
		}

		return null
	}

	private bigIntRange(): [bigint, bigint] {
		const firstAddress = this.computeFirstAddressInCIDRBlock()
		const lastAddress = this.computeLastAddressInCIDRBlock()
		return [ipToBigInt(firstAddress), ipToBigInt(lastAddress)]
	}

	private computeFirstAddressInCIDRBlock(): string {
		const bits: number[] = Array.from(this.bits)
		for (let i = this.reservedBitCount; i < 32; ++i) {
			bits[i] = 0
		}
		return bitArrayToAddress(bits)
	}

	private computeLastAddressInCIDRBlock(): string {
		const bits: number[] = Array.from(this.bits)
		for (let i = this.reservedBitCount; i < 32; ++i) {
			bits[i] = 1
		}
		return bitArrayToAddress(bits)
	}

}

function bitArrayToAddress(bits: number[]): string {
	return [
		parseInt(bits.slice(0, 8).join(""), 2),
		parseInt(bits.slice(8, 16).join(""), 2),
		parseInt(bits.slice(16, 24).join(""), 2),
		parseInt(bits.slice(24, 32).join(""), 2),
	].join(".")
}

function decimalToBinaryBits(num: number): number[] {
	return padLeft(num.toString(2), "0", 8).split("").map(c => parseInt(c, 2))
}

function ipToBigInt(ip: string): bigint {
	return BigInt("0b" + ip.split(".").map(n => padLeft(parseInt(n, 10).toString(2), "0", 8)).join(""))
}

function checkCIDRConflicts(input: string): string[] {
	const cidrBlocks: string[] = Array.from(input.matchAll(/(\d+\.){3}\d+\/\d+/g)).map(m => m[0])

	const conflicts: string[] = []
	for (let i = 0; i < cidrBlocks.length; ++i) {
		const block1 = new CIDRBlock(cidrBlocks[i])
		for (let j = i + 1; j < cidrBlocks.length; ++j) {
			const block2 = new CIDRBlock(cidrBlocks[j])
			const c = block1.checkConflictWith(block2)
			if (c != null) {
				conflicts.push(c)
			}
		}
	}

	return conflicts
}

export default class extends ToolView {
	static title = "CIDR Block Tester"

	private readonly expression: Stream<string> = Stream("172.168.0.1/16")
	private readonly cidrBlock: Stream<CIDRBlock> = this.expression.map(e => new CIDRBlock(e))

	private readonly checkAddress: Stream<string> = Stream("")
	private readonly isCheckAddressInBlock: Stream<boolean> = Stream.lift((cidrBlock, checkAddress) => {
		if (checkAddress === "") {
			return true
		}

		let address
		try {
			// FIXME: We expect an actual IP address here, don't parse it as a CIDR block.
			address = new CIDRBlock(checkAddress)
		} catch (err) {
			return false
		}

		for (let i = cidrBlock.reservedBitCount; i--;) {
			if (address.bits[i] !== cidrBlock.bits[i]) {
				return false
			}
		}

		return true
	}, this.cidrBlock, this.checkAddress)

	private readonly conflictCheckInput: Stream<string> = Stream("172.168.0.1/16\n172.168.10.1/24\n")

	mainView(): m.Children {
		return [
			m(Input, {
				class: "form-control font-monospace fs-2",
				style: {
					width: "30ch",
				},
				placeholder: "CIDR Block",
				model: this.expression,
			}),
			m("p", [
				"Describes ",
				m("code", this.cidrBlock().addressCount),
				" ",
				this.cidrBlock().addressCount > 1
					? [
						"addresses, starting from ",
						m("code", this.cidrBlock().firstAddress),
						" to ",
						m("code", this.cidrBlock().lastAddress),
					]
					: [
						"address, ",
						m("code", this.cidrBlock().firstAddress),
					],
				".",
			]),
			m(BitsDisplay, {
				address: this.cidrBlock(),
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
			m("p", "Enter a list of CIDR blocks to check for conflicts."),
			m(Textarea, {
				placeholder: "Enter CIDR blocks to check for conflicts",
				model: this.conflictCheckInput,
				class: "font-monospace",
			}),
			checkCIDRConflicts(this.conflictCheckInput()).map(conflict => m("p", conflict)),
		]
	}
}

class BitsDisplay implements m.ClassComponent<{ address: CIDRBlock }> {
	view(vnode: m.Vnode<{ address: CIDRBlock }>): m.Children {
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
