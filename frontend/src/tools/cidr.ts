import Stream from "mithril/stream"
import m from "mithril"
import { EditorView, keymap } from "~node_modules/@codemirror/view"
import { Input, Textarea, ToolView } from "../components"
import { LRLanguage } from "@codemirror/language"
import { LanguageSupport } from "~node_modules/@codemirror/language"
import { defaultKeymap } from "~node_modules/@codemirror/commands"
import { minimalSetup } from "~node_modules/codemirror"
import { padLeft } from "../utils"
import { parser } from "~src/parsers/cidr"
import { styleTags, tags as t } from "@lezer/highlight"

export const cidrLang = LRLanguage.define({
	parser: parser.configure({
		props: [
			styleTags({
				N1: t.number,
				N2: t.string,
				N3: t.keyword,
				N4: t.tagName,
			}),
		],
	}),
})

export class CIDRBlock4 {
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

	checkConflictWith(other: CIDRBlock4): null | string {
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
		const block1 = new CIDRBlock4(cidrBlocks[i])
		for (let j = i + 1; j < cidrBlocks.length; ++j) {
			const block2 = new CIDRBlock4(cidrBlocks[j])
			const c = block1.checkConflictWith(block2)
			if (c != null) {
				conflicts.push(c)
			}
		}
	}

	return conflicts
}

export class CIDRBlock6 {
	typedArray: Uint16Array = new Uint16Array(8)
	reservedBitCount: number = 0

	constructor(private readonly expression: string) {
		const [address, reservedBitCountStr] = this.expression.split("/")
		this.reservedBitCount = parseInt(reservedBitCountStr, 10)
		const parts = address.split(":")
		if (parts.length < 8) {
			if (parts.includes("")) {
				if (parts[0] === "") {
					parts.shift()
				} else if (parts[parts.length - 1] === "") {
					parts.pop()
				}
				parts.splice(
					parts.indexOf(""),
					1,
					...Array.from("0".repeat(9 - parts.length)),
				)
			} else {
				throw new Error(`Invalid address: ${ this.expression }`)
			}
		}
		this.typedArray = new Uint16Array(parts.map(p => parseInt(p, 16)))
	}
}

export default class extends ToolView {
	static title = "CIDR Block Tester"
	static layout = ToolView.Layout.Page

	private readonly cidrBlock: Stream<null | CIDRBlock4 | CIDRBlock6> = Stream(null)
	private editor: null | EditorView = null

	private readonly checkAddress: Stream<string> = Stream("")
	private readonly isCheckAddressInBlock: Stream<boolean> = Stream.lift((cidrBlock, checkAddress) => {
		if (checkAddress === "" || cidrBlock == null) {
			return true
		}

		let address
		try {
			// FIXME: We expect an actual IP address here, don't parse it as a CIDR block.
			address = new CIDRBlock4(checkAddress)
		} catch (err) {
			return false
		}

		for (let i = cidrBlock.reservedBitCount; i--;) {
			if (address.bits[i] !== (cidrBlock as CIDRBlock4).bits[i]) {
				return false
			}
		}

		return true
	}, this.cidrBlock, this.checkAddress)

	private readonly conflictCheckInput: Stream<string> = Stream("172.168.0.1/16\n172.168.10.1/24\n")

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".cm-editor")
		if (spot != null) {
			this.editor = new EditorView({
				doc: "afc9:b:c:d:e:f:1:2/32",
				extensions: [
					keymap.of(defaultKeymap),
					minimalSetup,
					EditorView.updateListener.of(update => {
						if (update.docChanged && this.editor?.hasFocus) {
							this.onExpressionChanged()
						}
					}),
					new LanguageSupport(cidrLang),
				],
			})
			spot.replaceWith(this.editor.dom)
			this.onExpressionChanged()
			this.editor.focus()
		}
	}

	mainView(): m.Children {
		const cidrBlock = this.cidrBlock()
		return [
			m("p.lead", [
				"Supports both IPv4 and IPv6 CIDR blocks. Try an IPv4 example like ",
				m("a", {
					href: "#",
					onclick: (event: MouseEvent) => {
						event.preventDefault()
						this.editor?.dispatch({
							changes: {
								from: 0,
								to: this.editor.state.doc.length,
								insert: (event.target as HTMLAnchorElement).innerText,
							},
						})
						this.onExpressionChanged()
					},
				}, m("code", "172.10.0.0/16")),
				", or an IPv6 example like ",
				m("a", {
					href: "#",
					onclick: (event: MouseEvent) => {
						event.preventDefault()
						this.editor?.dispatch({
							changes: {
								from: 0,
								to: this.editor.state.doc.length,
								insert: (event.target as HTMLAnchorElement).innerText,
							},
						})
						this.onExpressionChanged()
					},
				}, m("code", "afc9:b::e:f:1:2/56")),
				".",
			]),
			m(".fs-2", m(".cm-editor")),
			cidrBlock != null && cidrBlock instanceof CIDRBlock4 && m("p", [
				"Describes ",
				m("code", cidrBlock.addressCount),
				" ",
				cidrBlock.addressCount > 1
					? [
						"addresses, starting from ",
						m("code", cidrBlock.firstAddress),
						" to ",
						m("code", cidrBlock.lastAddress),
					]
					: [
						"address, ",
						m("code", cidrBlock.firstAddress),
					],
				".",
			]),
			cidrBlock instanceof CIDRBlock4 && m(BitsDisplay4, {
				address: cidrBlock,
			}),
			cidrBlock instanceof CIDRBlock6 && m(BitsDisplay6, {
				address: cidrBlock,
			}),
			m(".row.d-flex.align-items-center", [
				m(".col-auto", m("label", { for: "checkInput" }, "Check if address falls in this block: ")),
				m(".col-auto", m(Input, {
					id: "checkInput",
					class: this.isCheckAddressInBlock() ? (this.checkAddress() === "" ? "" : "is-valid") : "is-invalid",
					model: this.checkAddress,
				})),
			]),
			m("h2.pt-1.mt-5.border-top.border-1.border-secondary", "Check for conflicts"),
			m("p", "Enter a list of CIDR blocks to check for conflicts."),
			m(Textarea, {
				placeholder: "Enter CIDR blocks to check for conflicts",
				model: this.conflictCheckInput,
				class: "font-monospace",
			}),
			checkCIDRConflicts(this.conflictCheckInput()).map(conflict => m("p", conflict)),
		]
	}

	onExpressionChanged() {
		const expression = this.editor?.state.doc.toString()
		if (expression == null) {
			this.cidrBlock(null)
		} else {
			try {
				this.cidrBlock(new CIDRBlock4(expression))
			} catch (error) {
				this.cidrBlock(new CIDRBlock6(expression))
			}
		}
		m.redraw()
	}
}

class BitsDisplay4 implements m.ClassComponent<{ address: CIDRBlock4 }> {
	view(vnode: m.Vnode<{ address: CIDRBlock4 }>): m.Children {
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

class BitsDisplay6 implements m.ClassComponent<{ address: CIDRBlock6 }> {
	view(vnode: m.Vnode<{ address: CIDRBlock6 }>): m.Children {
		const cidrBlock = vnode.attrs.address
		console.log(cidrBlock.reservedBitCount)
		return m(".vstack.gap-2.font-monospace", Array.from(cidrBlock.typedArray).map((n: number, i: number) => m(".hstack.gap-2", [
			padLeft(n.toString(16), "0", 4),
			padLeft(n.toString(2), "0", 16)
				.split("")
				.map((bit: string, j: number) => m(BitBox, { class: i * 16 + j < cidrBlock.reservedBitCount ? "bg-danger bg-opacity-25" : "" }, bit)),
		])))
	}
}

class BitBox implements m.ClassComponent<Record<string, unknown>> {
	view(vnode: m.Vnode<Record<string, unknown>>): m.Children {
		return m(".d-inline-flex.align-items-center.justify-content-center", {
			...vnode.attrs,
			style: {
				width: "1.1em",
				lineHeight: "1.1em",
			},
		}, vnode.children)
	}
}
