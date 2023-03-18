import { defineConfig } from "@playwright/test"

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require("dotenv").config();

declare const process: any
const isCI = !!process.env.CI

// Ref: <https://playwright.dev/docs/test-configuration>
export default defineConfig({
	testDir: "./tests",
	timeout: 30000, // Maximum time one test can run for.
	expect: {
		// Maximum time expect() should wait for the condition to be met.
		// For example in `await expect(locator).toHaveText();`
		timeout: 5000,
	},
	fullyParallel: true, // Run tests in files in parallel
	forbidOnly: isCI, // Fail the build on CI if you accidentally left test.only in the source code.
	retries: isCI ? 2 : 0, // Retry on CI only
	workers: isCI ? 1 : undefined, // Opt out of parallel tests on CI.
	reporter: isCI ? "github" : "html", // Reporter to use. See https://playwright.dev/docs/test-reporters

	// Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
	use: {
		baseURL: "http://localhost:3060",
		browserName: "chromium",

		viewport: {
			width: 1200,
			height: 1200,
		},

		trace: isCI ? "retain-on-failure" : "on",
		video: isCI ? "retain-on-failure" : "on",
		screenshot: isCI ? "only-on-failure" : "on",
	},
})
