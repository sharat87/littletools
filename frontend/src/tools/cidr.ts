import Stream from "mithril/stream"
import m from "mithril"
import { EditorView, keymap } from "@codemirror/view"
import { Input, Textarea, ToolView } from "../components"
import { LanguageSupport, LRLanguage, syntaxHighlighting } from "@codemirror/language"
import { minimalSetup } from "codemirror"
import { padLeft } from "../utils"
import { parser } from "~src/parsers/cidr"
import { styleTags, tags as t } from "@lezer/highlight"
import { defaultKeymap } from "@codemirror/commands"
import { classHighlightStyle } from "~src/components/CodeMirror"
import { chunk, fill } from "lodash"

export const cidrLang = LRLanguage.define({
	parser: parser.configure({
		props: [
			styleTags({
				N1: t.number,
				N2: t.string,
				N3: t.tagName,
				N4: t.keyword,
			}),
		],
	}),
})

abstract class CIDRBlock {
	abstract maxBits: number

	reservedBitCount: number = 0
	bits: number[] = []
	addressCount: number = 0
	firstAddress: string = ""
	lastAddress: string = ""

	protected constructor(readonly expression: string) {
	}

	includes(checkAddress: string): boolean {
		if (checkAddress === "") {
			return true
		}

		let address
		try {
			address = parseCIDRBlock(checkAddress)
		} catch (err) {
			return false
		}

		for (let i = this.reservedBitCount; i--;) {
			if (address.bits[i] !== this.bits[i]) {
				return false
			}
		}

		return true
	}

	isConflicting(other: CIDRBlock): null | "subset" | "superset" | "same" {
		const minReservedCount = Math.min(this.reservedBitCount, other.reservedBitCount)
		for (let i = minReservedCount; i--;) {
			if (this.bits[i] !== other.bits[i]) {
				return null
			}
		}

		if (this.reservedBitCount < other.reservedBitCount) {
			return "superset"
		} else if (this.reservedBitCount > other.reservedBitCount) {
			return "subset"
		}

		return "same"
	}

	protected bitsChanged(): void {
		this.addressCount = this.reservedBitCount < 0 || this.reservedBitCount > this.maxBits ? -1 : Math.pow(2, this.maxBits - this.reservedBitCount)

		this.firstAddress = this.computeFirstAddressInCIDRBlock()
		this.lastAddress = this.computeLastAddressInCIDRBlock()
	}

	protected abstract bitsToAddress(bits: number[]): string

	protected computeFirstAddressInCIDRBlock(): string {
		return this.bitsToAddress(fill(Array.from(this.bits), 0, 1 + this.reservedBitCount))
	}

	protected computeLastAddressInCIDRBlock(): string {
		return this.bitsToAddress(fill(Array.from(this.bits), 1, 1 + this.reservedBitCount))
	}

}

export class CIDRBlock4 extends CIDRBlock {
	maxBits = 32

	n1: number = 0
	n2: number = 0
	n3: number = 0
	n4: number = 0

	constructor(expression: string) {
		super(expression)
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

		this.bitsChanged()
	}

	protected bitsToAddress(bits: number[]): string {
		return chunk(bits, 8)
			.map(b => parseInt(b.join(""), 2))
			.join(".")
	}

}

function decimalToBinaryBits(num: number): number[] {
	return padLeft(num.toString(2), "0", 8).split("").map(c => parseInt(c, 2))
}

function checkCIDRConflicts(input: string): string[] {
	const cidrBlocks: string[] = Array.from(input.matchAll(/(\d+\.){3}\d+\/\d+/g)).map(m => m[0])

	const conflicts: string[] = []
	for (let i = 0; i < cidrBlocks.length; ++i) {
		const block1 = parseCIDRBlock(cidrBlocks[i])
		for (let j = i + 1; j < cidrBlocks.length; ++j) {
			const block2 = parseCIDRBlock(cidrBlocks[j])
			const c = block1.isConflicting(block2)
			if (c === "superset") {
				conflicts.push(`${ block1.expression } contains ${ block2.expression }`)
			} else if (c === "subset") {
				conflicts.push(`${ block2.expression } contains ${ block1.expression }`)
			}
		}
	}

	return conflicts
}

export class CIDRBlock6 extends CIDRBlock {
	maxBits = 128

	typedArray: Uint16Array = new Uint16Array(8)

	constructor(expression: string) {
		super(expression)
		const [address, reservedBitCountStr] = this.expression.split("/")
		this.reservedBitCount = reservedBitCountStr == null ? 128 : parseInt(reservedBitCountStr, 10)

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

		const numbers = parts.map(p => parseInt(p, 16))
		this.bits = [
			...decimalToBinaryBits(numbers[0]),
			...decimalToBinaryBits(numbers[1]),
			...decimalToBinaryBits(numbers[2]),
			...decimalToBinaryBits(numbers[3]),
			...decimalToBinaryBits(numbers[4]),
			...decimalToBinaryBits(numbers[5]),
			...decimalToBinaryBits(numbers[6]),
			...decimalToBinaryBits(numbers[7]),
		]

		this.typedArray = new Uint16Array(numbers)

		this.bitsChanged()
	}

	protected bitsToAddress(bits: number[]): string {
		return chunk(bits, 16)
			.map((chunk) => parseInt(chunk.join(""), 2).toString(16))
			.join(":")
	}

}

export function parseCIDRBlock(input: string): CIDRBlock {
	return input.includes(":") ? new CIDRBlock6(input) : new CIDRBlock4(input)
}

export default class extends ToolView {
	static title = "CIDR Block Tester"
	static layout = ToolView.Layout.Page

	private readonly cidrBlock: Stream<null | CIDRBlock> = Stream(null)
	private editor: null | EditorView = null

	private readonly checkAddress: Stream<string> = Stream("")
	private readonly isCheckAddressInBlock: Stream<boolean> = Stream.lift((cidrBlock, checkAddress) => {
		return cidrBlock?.includes(checkAddress) ?? true
	}, this.cidrBlock, this.checkAddress)

	private readonly conflictCheckInput: Stream<string> = Stream("172.168.0.1/16\n172.168.10.1/24\n")

	oncreate(vnode: m.VnodeDOM): void {
		const spot = vnode.dom.querySelector(".cm-editor")
		if (spot != null) {
			this.editor = new EditorView({
				doc: "172.10.0.0/16",
				extensions: [
					keymap.of(defaultKeymap),
					minimalSetup,
					syntaxHighlighting(classHighlightStyle),
					EditorView.updateListener.of(update => {
						if (update.docChanged && this.editor?.hasFocus) {
							this.onExpressionChanged()
						}
					}),
					new LanguageSupport(cidrLang),
				],
			})
			spot.replaceWith(this.editor.dom)
			;(this.editor.dom as any).CodeMirror = this.editor
			this.onExpressionChanged()
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
			m(".fs-2.mb-4", m(".cm-editor")),
			cidrBlock != null && m("p", [
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
				this.cidrBlock(parseCIDRBlock(expression))
			} catch (error) {
				this.cidrBlock(null)
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
		return m(".vstack.gap-1.font-monospace", Array.from(cidrBlock.typedArray).map((n: number, i: number) => m(".hstack.gap-1", [
			m("span.me-3", padLeft(n.toString(16), "0", 4)),
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
