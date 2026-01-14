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
let testImpl = base
if (process.env.CI) {
  testImpl = mockTest
}

export const test = testImpl.extend<TestOptions, WorkerFixture>({
    authToken: [ async ({}, use) => {
        const authToken = await createToken(config.userEmail, config.userPassword)
        await use(authToken)
    }, {scope: 'worker'}],

    api: async({request, authToken}, use)  => {
        if (process.env.CI) {
            // Use mock API fixture for CI
            class MockRequestHandler extends RequestHandler {
                constructor() {
                    // Provide dummy values for required constructor params
                    super(undefined as any, undefined as any, '', '')
                }
                override path(endpoint: string) {
                    // Optionally store endpoint in a public or protected property if needed, but do not declare a new private property
                    (this as any)._mockApiPath = endpoint
                    return this
                }
                override clearAuth() {
                    return this
                }
                override headers(headers: any) {
                    return this
                }
                override params(params: any) {
                    return this
                }
                override body(body: any) {
                    return this
                }
                override async getRequest(status: number) {
                    if ((this as any)._mockApiPath === '/user') {
                        return {
                            status: 'error',
                            message: 'missing authorization credentials'
                        }
                    }
                    // ...extend for other endpoints as needed
                    return undefined
                }
                override async postRequest(status: number) {
                    return undefined
                }
                override async putRequest(status: number) {
                    return undefined
                }
                override async deleteRequest(status: number) {
                    return undefined
                }
            }
            await use(new MockRequestHandler())
        } else {
            // Logger instance for redacting secrets and capturing request/response details
            const logger = new APILogger()
            // Attach logger to custom expect matchers for enriched error messages
            setCustomExpectLogger(logger)
            // Initialize the fluent API client with Playwright's request context, logger, and base URL
            const requestHandler = new RequestHandler(request, logger, config.apiUrl, authToken)
            // Provide the configured API client to the test
            await use(requestHandler)
        }
    },
    config: async ({}, use) => {
        await use(config)
     }
})

test.afterAll(async () => {
    await PerformanceMetrics.saveMetrics()
    await PerformanceMetrics.generateReport()
})