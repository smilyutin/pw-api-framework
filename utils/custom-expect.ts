// Custom expect matchers that integrate with APILogger to include recent API logs in error messages.
// Extends Playwright's base expect with domain-specific matchers for clearer test assertions.

import { expect as baseExpect } from '@playwright/test'
import { APILogger } from './logger'

// Shared logger instance for attaching API logs to assertion failures
let apiLogger: APILogger

// Set the logger instance to be used by custom matchers
export const setCustomExpectLogger = (logger: APILogger) => {
    apiLogger = logger
}

// Extend Playwright's Matchers interface with custom assertion methods
declare global {
    namespace PlaywrightTest {
        interface Matchers<R, T>  {
            shouldEqual(expected: T): R
            shouldBeLessThanOrEqual(expected: T): R
        
        }
    }
}

// Custom expect with enriched error messages including recent API request/response logs
export const expect = baseExpect.extend({
    // Custom equality matcher that appends recent API logs to failure messages
    // Provides better debugging context by showing request/response details when assertions fail
    shouldEqual(received: any, expected: any) {
        let pass: boolean
        let logs: string = ''

        try {
            // Delegate to Playwright's built-in toEqual
            baseExpect(received).toEqual(expected)
            pass = true
            // Include logs when using .not.shouldEqual and the assertion passes (useful for negative cases)
            if(this.isNot) {
                logs = apiLogger.getRecentLogs()
            }
        } catch (e: any) {
            // Assertion failed, capture logs for error message
            pass = false
            logs = apiLogger.getRecentLogs()
        }

        const hint = this.isNot ? 'not' : ''
        const message = this.utils.matcherHint('shouldEqual', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected $(hint) ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API logs:\n${logs}`

        return {
            message: () => message,
            pass
        };
    },
    // Custom less-than-or-equal matcher with API log enrichment
    // Useful for validating pagination limits, counts, and numeric constraints
    shouldBeLessThanOrEqual(received: any, expected: any) {
        let pass: boolean
        let logs: string = ''

        try {
            // Delegate to Playwright's built-in toBeLessThanOrEqual
            baseExpect(received).toBeLessThanOrEqual(expected)
            pass = true
            // Include logs for negative assertions that pass
            if(this.isNot) {
                logs = apiLogger.getRecentLogs()
            }
        } catch (e: any) {
            // Assertion failed, capture logs for debugging
            pass = false
            logs = apiLogger.getRecentLogs()
        }

        const hint = this.isNot ? 'not' : ''
        const message = this.utils.matcherHint('shouldBeLessThanOrEqual', undefined, undefined, { isNot: this.isNot }) +
            '\n\n' +
            `Expected $(hint) ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(received)}\n\n` +
            `Recent API logs:\n${logs}`

        return {
            message: () => message,
            pass
        };

    }

})
