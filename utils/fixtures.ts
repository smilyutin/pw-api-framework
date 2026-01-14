// Playwright fixtures providing a pre-configured API client with logging and custom expectations.
// Centralizes setup for all API tests: base URL, logger, and request handler initialization.

import { test as base } from '@playwright/test'
import { test as mockTest } from './mock-api-fixture'
import { RequestHandler } from '../utils/request-handler'
import { APILogger } from '../utils/logger'
import { setCustomExpectLogger } from './custom-expect'
import { config } from '../api-test.config'
import { createToken } from '../helpers/createToken'
import { PerformanceMetrics } from './performance-metrics'

// Type definition for test fixtures available in all tests
export type TestOptions = {
    api: RequestHandler;  // Fluent API client for building and executing HTTP requests
    config: typeof config; // Configuration object imported from api-test.config.ts
}

export type WorkerFixture = {
    authToken: string
}
// Extended Playwright test with custom 'api' fixture
export const test = base.extend<TestOptions, WorkerFixture>({
    authToken: [ async ({}, use) => {
        const authToken = await createToken(config.userEmail, config.userPassword)
        await use(authToken)
    }, {scope: 'worker'}],

    api: async({request, authToken}, use)  => {
        // Logger instance for redacting secrets and capturing request/response details
        const logger = new APILogger()
        // Attach logger to custom expect matchers for enriched error messages
        setCustomExpectLogger(logger)
        // Initialize the fluent API client with Playwright's request context, logger, and base URL
        const requestHandler = new RequestHandler(request, logger, config.apiUrl, authToken)
        // Provide the configured API client to the test
        await use(requestHandler)
    },
    config: async ({}, use) => {
        await use(config)
     }
})

test.afterAll(async () => {
    await PerformanceMetrics.saveMetrics()
    await PerformanceMetrics.generateReport()
})