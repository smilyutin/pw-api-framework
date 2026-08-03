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
    articleCleanup: ArticleCleanup; // Tracks and cleans up articles created during test
}

export type WorkerFixture = {
    authToken: string
}

export class ArticleCleanup {
    private articleSlugs: Set<string> = new Set()
    private api: RequestHandler | null = null

    setApi(api: RequestHandler) {
        this.api = api
    }

    track(slug: string) {
        this.articleSlugs.add(slug)
    }

    async cleanupAll() {
        if (!this.api) return
        for (const slug of this.articleSlugs) {
            try {
                await this.api
                    .path(`/articles/${slug}`)
                    .deleteRequest(204)
            } catch (error) {
                console.warn(`Failed to cleanup article ${slug}:`, error)
            }
        }
        this.articleSlugs.clear()
    }
}

// Extended Playwright test with custom 'api' fixture
export const test = base.extend<TestOptions, WorkerFixture>({
    authToken: [ async ({}, use) => {
        const authToken = await createToken(config.userEmail, config.userPassword)
        // Save token to CSV
        const fs = await import('fs')
        const path = require('path')
        const csvPath = path.resolve(process.cwd(), 'auth-tokens.csv')
        const header = 'timestamp,token\n'
        const row = `${new Date().toISOString()},${authToken}\n`
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, header + row)
        } else {
            fs.appendFileSync(csvPath, row)
        }
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
    },
    articleCleanup: async ({}, use) => {
        const cleanup = new ArticleCleanup()
        await use(cleanup)
        // Automatic cleanup after test
        await cleanup.cleanupAll()
    }
})

test.afterAll(async () => {
    await PerformanceMetrics.saveMetrics()
    await PerformanceMetrics.generateReport()
})