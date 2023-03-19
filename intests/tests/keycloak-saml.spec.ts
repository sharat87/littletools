import { expect, test } from '@playwright/test'

const LITTLETOOLS_BASE_URL = "http://localhost:3060"
const KEYCLOAK_BASE_URL = "http://localhost:7200"

test("signup and logout with SAML", async ({ page, baseURL }) => {
	if (baseURL == null) {
		return test.skip()
	}

	const runId = Math.random().toString(36).substring(2, 15)
	const samlIdpAlias = "saml-" + runId
	const name = "Test " + runId
	const email = "test-" + runId + "@example.com"

	await page.goto(LITTLETOOLS_BASE_URL + "/saml-provider")
	const metadataUrl = await page.getByTestId("metadata-url").textContent()
	expect(metadataUrl).not.toBeNull()
	if (metadataUrl == null) {
		return
	}

	await page.goto(KEYCLOAK_BASE_URL + "/admin")

	await expect(page).toHaveTitle(/Sign in to Keycloak/)

	await page.locator("#username").fill("admin")
	await page.locator("#password").fill("admin")
	await page.locator("#kc-login").click()
	await page.locator("#nav-item-identity-providers").waitFor()

	// Create SAML IdP
	await page.goto(KEYCLOAK_BASE_URL + "/admin/master/console/#/master/identity-providers/saml/add")
	await page.locator("#alias").fill(samlIdpAlias)
	await page.locator("#kc-discovery-endpoint").fill(metadataUrl.replace("localhost", "host.docker.internal"))
	await page.locator("#kc-discovery-endpoint").blur()
	await page.locator("#kc-discovery-endpoint.pf-m-success").waitFor()
	await page.getByTestId("createProvider").click()

	// Assign auto-admin role mapper
	// TODO: Use SAML attribute to role mapping.
	await page.locator("#pf-tab-mappers-mappers").click()
	await page.getByTestId("no-mappers-empty-action").click()
	await page.locator("#kc-name").fill("auto-admin")
	await page.locator("#identityProviderMapper").click()
	await page.locator("[datatest-id='oidc-hardcoded-role-idp-mapper']").click()
	await page.getByTestId("add-roles").click()
	// await page.locator("input[type='radio']:left-of(td:text('admin'))").click()
	await page.locator("input[type='radio'][name='radioGroup']").first().click()
	await page.getByTestId("assign").click()
	await page.getByTestId("new-mapper-save-button").click()

	// Signout
	await page.locator("#user-dropdown").click()
	await page.locator("#sign-out").click()
	await expect(page).toHaveTitle(/Sign in to Keycloak/)

	// LittleTools SAML authorize form
	await page.locator("#social-" + samlIdpAlias).click()
	await page.waitForURL(url => url.toString().startsWith(baseURL))
	await expect(page).toHaveTitle(/SAML Provider Authorize/)
	await page.locator("#saml-idp-auth-name-").fill(name)
	await page.locator("#saml-idp-auth-email-").fill(email)
	await page.locator("[type='submit'][value='approve']").click()

	// Keycloak signup form
	await page.locator("#kc-page-title").waitFor()
	await page.locator("#email").fill(await page.locator("#username").inputValue())
	await page.locator("#firstName").fill("Test")
	await page.locator("#lastName").fill(runId)
	await page.locator("[type='submit']").click()

	await page.locator("#nav-item-identity-providers").waitFor()
	await page.goto(KEYCLOAK_BASE_URL + "/realms/master/account/#/personal-info")
	await expect(page.locator("#email-address")).toHaveValue(email)

	await page.locator("#signOutButton").click()
	await expect(page.locator("#landingSignInButton")).toBeVisible()
})
