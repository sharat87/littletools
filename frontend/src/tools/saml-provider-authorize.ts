import m from "mithril"
import { ToolView } from "~/src/components"
import Stream from "mithril/stream"
import { Button, Form, Icon, Input } from "../components"

/*
 * This is the authorize page of the fake SAML provider.
 */

export default class extends ToolView {
	static title = "SAML Provider Authorize"
	static isHidden = true
	static isKioskMode = true

	name: Stream<string> = Stream("Agent Smith")
	email: Stream<string> = Stream("smith@example.com")

	requestId: Stream<string>
	spIssuer: Stream<string>
	idpIssuer: Stream<string>
	spEndpoint: Stream<string>
	relayState: Stream<string>

	constructor() {
		super()
		const params = new URL(location.href).searchParams
		this.requestId = Stream(params.get("requestId") ?? "")
		this.spIssuer = Stream(params.get("spIssuer") ?? "")
		this.idpIssuer = Stream(params.get("idpIssuer") ?? "")
		this.spEndpoint = Stream(params.get("spEndpoint") ?? "")
		this.relayState = Stream(params.get("relayState") ?? "")
	}

	mainView(): m.Children {
		return [
			m("p.lead", "This is a fake authentication approval page. If you weren't expecting to see this, close this tab and report to the admin of whatever website sent you here."),
			m("p.text-danger.my-2", "Don't provide any real credentials, and don't use this in production."),
			m(Form, {
				id: "saml-idp-auth",
				onsubmit: (event: Event) => {
					event.preventDefault()
					const form = document.createElement("form")
					form.action = this.spEndpoint()
					form.method = "POST"
					const input = document.createElement("input")
					input.name = "SAMLResponse"
					input.value = makeSamlResponse(this.name(), this.email(), this.requestId(), this.spIssuer(), this.idpIssuer(), this.spEndpoint())
					form.appendChild(input)
					const relayState = document.createElement("input")
					relayState.name = "RelayState"
					relayState.value = this.relayState()
					form.appendChild(relayState)
					form.style.height = "0"
					document.body.appendChild(form)
					form.submit()
				},
				fields: [
					Form.field("Name", () => m(Input, { model: this.name })),
					Form.field("Email", () => m(Input, { model: this.email }))
						.subText(!this.email().endsWith("@example.com") && ["Domain in the email will be changed to ", m("code", "@example.com"), "."]),
				],
				buttons: () => [
					m(Button, {
						appearance: "success",
						type: "submit",
						name: "choice",
						value: "approve",
					}, [m(Icon, "done"), "Approve"]),
					m(Button, {
						appearance: "outline-danger",
						type: "submit",
						name: "choice",
						value: "reject",
					}, [m(Icon, "close"), "Reject"]),
				],
			}),
			m(".row.mb-3", [
				m("label.col-md-2.col-form-label"),
				m(".col-md-5", m(".form-text.text-secondary", ["Powered by ", m("a", { href: "https://littletools.app/saml-provider" }, "LittleTools"), "."])),
			]),
		]
	}

}

function randomId() {
	return window.btoa(Math.random().toString()).replace(/=/g, "")
}

function makeSamlResponse(name: string, email: string, requestId: string, spIssuer: string, idpIssuer: string, spEndpoint: string) {
	const now = new Date().toISOString()

	const expiry = new Date()
	expiry.setFullYear(expiry.getFullYear() + 1)
	const expiryString = expiry.toISOString()

	return window.btoa(`
		<?xml version="1.0" encoding="UTF-8"?>
		<p:Response xmlns:p="urn:oasis:names:tc:SAML:2.0:protocol" xmlns="urn:oasis:names:tc:SAML:2.0:assertion" ID="${ randomId() }" Version="2.0" IssueInstant="${ now }" Destination="${ spEndpoint }" InResponseTo="${ requestId }">
		  <Issuer>${ idpIssuer }</Issuer>
		  <p:Status>
			<p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" />
		  </p:Status>
		  <Assertion ID="${ randomId() }" Version="2.0" IssueInstant="${ now }">
			<Issuer>${ idpIssuer }</Issuer>
			<Subject>
			  <NameID>${ email }</NameID>
			  <SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
				<SubjectConfirmationData NotOnOrAfter="${ expiryString }" Recipient="${ spEndpoint }" InResponseTo="${ requestId }"/>
			  </SubjectConfirmation>
			</Subject>
			<Conditions NotBefore="${ now }" NotOnOrAfter="${ expiryString }">
			  <AudienceRestriction>
				<Audience>${ spIssuer }</Audience>
			  </AudienceRestriction>
			</Conditions>
			<AuthnStatement AuthnInstant="${ now }" SessionNotOnOrAfter="${ expiryString }" SessionIndex="${ randomId() }">
			  <AuthnContext>
				<AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified</AuthnContextClassRef>
			  </AuthnContext>
			</AuthnStatement>
			<AttributeStatement xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema">
			  <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
				<AttributeValue xsi:type="xs:string">${ email }</AttributeValue>
			  </Attribute>
			  <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
				<AttributeValue xsi:type="xs:string">${ email }</AttributeValue>
			  </Attribute>
			  <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
				<AttributeValue xsi:type="xs:string">${ name }</AttributeValue>
			  </Attribute>
			  <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
				<AttributeValue xsi:type="xs:string">${ name.split(/\s/)[0] }</AttributeValue>
			  </Attribute>
			</AttributeStatement>
		  </Assertion>
		</p:Response>
	`.trim())
}
