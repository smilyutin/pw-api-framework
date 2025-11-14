// Playwright fixtures providing a pre-configured API client with logging and custom expectations.
// Centralizes setup for all API tests: base URL, logger, and request handler initialization.

import { test as base } from '@playwright/test'
import { RequestHandler } from '../utils/request-handler'
import { APILogger } from '../utils/logger'
import { setCustomExpectLogger } from './custom-expect'
import { config } from '../api-test.config'

// Type definition for test fixtures available in all tests
export type TestOptions = {
    api: RequestHandler;  // Fluent API client for building and executing HTTP requests
    config: typeof config; // Configuration object imported from api-test.config.ts
}

// Extended Playwright test with custom 'api' fixture
export const test = base.extend<TestOptions>({
    // API fixture: provides a configured RequestHandler instance for each test
    api: async({request}, use)  => {
        // Base URL for all API calls

        // Logger instance for redacting secrets and capturing request/response details
        const logger = new APILogger()
        // Attach logger to custom expect matchers for enriched error messages
        setCustomExpectLogger(logger)
        // Initialize the fluent API client with Playwright's request context, logger, and base URL
        const requestHandler = new RequestHandler(request, logger, config.apiUrl)
        // Provide the configured API client to the test
        await use(requestHandler)
    },
    config: async ({}, use) => {
        await use(config)
     }
})