import m from "mithril"
import Stream from "mithril/stream"

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
		throw new Error(`Invalid address: ${address}`)
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
	return pad(num.toString(2)).split("").map(c => parseInt(c, 2))
}

function pad(s: string): string {
	while (s.length < 8) {
		s = "0" + s
	}
	return s
}

export default class {
	private readonly expression: Stream<string>
	private readonly parsedExpression: Stream<ParsedExpression>
	private readonly firstAddress: Stream<string>
	private readonly lastAddress: Stream<string>
	private readonly countAddresses: Stream<number>
	private readonly checkAddress: Stream<string>
	private readonly isCheckAddressInBlock: Stream<boolean>

	static title = "CIDR Block"
	static slug = "cidr"

	constructor() {
		this.expression = Stream("1.2.3.4/16")
		this.parsedExpression = this.expression.map(parseAddress)
		this.firstAddress = this.parsedExpression.map(computeFirstAddressInCIDRBlock)
		this.lastAddress = this.parsedExpression.map(computeLastAddressInCIDRBlock)
		this.countAddresses = this.parsedExpression.map(({ reservedBitCount }) => {
			return reservedBitCount < 0 || reservedBitCount > 32 ? -1 : Math.pow(2, 32 - reservedBitCount)
		})
		this.checkAddress = Stream("")

		this.isCheckAddressInBlock = Stream.lift((parsedExpression, checkAddress) => {
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
	}

	view() {
		return m(".h100.pa1", [
			m("h1", "CIDR Block"),
			m("input.mono", {
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
			m("p", [
				"Check if address falls in this block: ",
				m("input", {
					class: this.isCheckAddressInBlock() ? undefined : "error",
					value: this.checkAddress(),
					oninput: (event: InputEvent) => {
						this.checkAddress((event.target as HTMLInputElement).value)
					},
				})
			]),
		])
	}
}

class BitsDisplay implements m.ClassComponent<{ address: ParsedExpression }> {
	view(vnode: m.Vnode<{ address: ParsedExpression }>): m.Children {
		const { n1, n2, n3, n4, bits, reservedBitCount } = vnode.attrs.address
		const unitSize = 1.3
		return m("pre.mv5.f3", [
			bits.map((bit: number, i: number) => {
				return m(
					"span.inline-flex.items-center.justify-center",
					{
						style: {
							width: unitSize + "em",
							lineHeight: unitSize + "em",
						},
						class: [
							i > 0 && i % 8 === 0 ? "ml4" : "",
							i < reservedBitCount ? "bg-light-yellow" : "", // reserved bits
						].join(" "),
					},
					bit,
				)
			}),
			"\n",
			[n1, n2, n3, n4].map((n: number, i: number) => m(
				"span.inline-flex.items-center.justify-center",
				{
					style: {
						width: (unitSize * 8) + "em",
						lineHeight: unitSize + "em",
					},
					class: i > 0 ? "ml4" : "",
				},
				n,
			)),
		])
	}
}
