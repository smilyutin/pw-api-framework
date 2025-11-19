// Fluent API request builder with integrated logging and status validation.
// Supports GET, POST, PUT, DELETE with chainable setters for URL, path, params, headers, and body.
// Automatically logs requests/responses with secret redaction and validates HTTP status codes.

import { APIRequestContext } from "@playwright/test"
import { expect } from '@playwright/test'
import { APILogger } from "./logger"
import { test } from "@playwright/test"


export class RequestHandler {

    // Playwright's request context for making HTTP calls
    private request: APIRequestContext | undefined
    // Logger for capturing and redacting sensitive request/response data
    private logger: APILogger
    // Override URL for specific requests (set via .url())
    private baseUrl: string | undefined
    // Default base URL used when .url() is not called
    private defaultBaseUrl: string | undefined
    // API endpoint path appended to base URL
    private apiPath: string | undefined
    // Query parameters for the request
    private queryParams: object = {}
    // HTTP headers (Authorization, Content-Type, etc.)
    private apiHeaders: Record<string, string> = {}
    // Request body for POST/PUT
    private apiBody: object = {}
    private defaultAuthToken: string
    private clearAuthFlag: boolean | undefined

    // Initialize with Playwright request context, logger, and default base URL
    constructor(request: APIRequestContext, logger: APILogger, baseUrl: string, authToken: string = '') {
        this.request = request
        this.defaultBaseUrl = baseUrl
        this.logger = logger
        this.defaultAuthToken = authToken
    }

    // Set a custom base URL for this request (overrides default)
    url(url: string) {
        this.baseUrl = url
        return this
    }

    // Set the API endpoint path (e.g., '/articles', '/users/login')
    path(path: string) {
        this.apiPath = path
        return this;
    }

    // Set query parameters (e.g., { limit: 10, offset: 0 })
    params(params: object) {
        this.queryParams = params
        return this;
    }

    // Set HTTP headers (e.g., { Authorization: 'Token abc123' })
    headers(headers: Record<string, string>) {
        this.apiHeaders = headers
        return this;
    }

    // Set request body for POST/PUT (will be JSON-encoded)
    body(body: object) {
        this.apiBody = body
        return this;
    }

    clearAuth() {
        this.clearAuthFlag = true
        return this
    }

    // Execute GET request, log it, validate status, and return parsed JSON response
    async getRequest(statusCode: number) {

        let responseJSON: any
        const url = this.getURL()
        await test.step(`Get request to: $(url)`, async () => {
            // Log outgoing request with redacted sensitive headers
            this.logger?.logRequest('GET', url, this.getHeaders())
            const response = await this.request?.get(url, {
                headers: this.getHeaders(),
            })
            this.cleanupFields()
            const actualStatus = response?.status()!
            responseJSON = await response?.json()
            // Log response with redacted body (tokens, passwords masked)
            this.logger.logResponse(actualStatus, {}, responseJSON)
            // Throw error with logs if status doesn't match expected
            this.statusCodeValidator(statusCode, actualStatus, this.getRequest)
        })

        return responseJSON
    }

    // Execute POST request with body, log it, validate status, and return parsed JSON response
    async postRequest(statusCode: number) {
        let responseJSON: any
        const url = this.getURL()
        await test.step(`POST request to: $(url)`, async () => {
// Log request including body (sensitive fields redacted)
        this.logger?.logRequest('POST', url, this.getHeaders(), this.apiBody)
        const response = await this.request?.post(url, {
            headers: this.getHeaders(),
            data: this.apiBody
        })
        this.cleanupFields()
        const actualStatus = response?.status()!
        responseJSON = await response?.json()
        // Log response with masked secrets
        this.logger.logResponse(actualStatus, {}, responseJSON)
        // Validate status and throw enriched error on mismatch
        this.statusCodeValidator(statusCode, actualStatus, this.postRequest)

        })
        

        return responseJSON
    }

    // Execute PUT request with body, log it, validate status, and return parsed JSON response
    async putRequest(statusCode: number) {
        let responseJSON: any
        const url = this.getURL()
        
        await test.step(`Put request to: $(url)`, async () => {
            // Log PUT request with redacted body
        this.logger?.logRequest('PUT', url, this.getHeaders(), this.apiBody)
        const response = await this.request?.put(url, {
            headers: this.getHeaders(),
            data: this.apiBody
        })
        this.cleanupFields()
        const actualStatus = response?.status()!
        responseJSON = await response?.json()
        // Log response
        this.logger.logResponse(actualStatus, {}, responseJSON)
        // Validate expected status code
        this.statusCodeValidator(statusCode, actualStatus, this.putRequest)
        })
        

        return responseJSON
    }

    // Execute DELETE request, log it, and validate status (no response body expected)
    async deleteRequest(statusCode: number) {
        const url = this.getURL()
        await test.step(`Delete request to: $(url)`, async () => {
            // Log DELETE request
        this.logger.logRequest('DELETE', url, this.getHeaders())
        const response = await this.request?.delete(url, {
            headers: this.getHeaders()
        })
        this.cleanupFields()
        const actualStatus = response?.status()!
        // Log response (typically no body for DELETE)
        this.logger.logResponse(actualStatus, {}, undefined)
        // Validate status and throw on mismatch
        this.statusCodeValidator(statusCode, actualStatus, this.deleteRequest)
        })
    }
    // Build the complete URL by combining base URL, path, and query params
    private getURL() {
        // Use custom URL if set, otherwise default base URL
        const url = new URL(`${this.baseUrl ?? this.defaultBaseUrl}${this.apiPath}`)
        // Append query parameters to the URL
        for (const [key, value] of Object.entries(this.queryParams)) {
            url.searchParams.append(key, value)
        }
        // Log the final URL for debugging
        console.log(url.toString())
        return url.toString()
    }

    // Validate HTTP status code and throw enriched error with API logs if mismatch
    private statusCodeValidator(expectedStatus: number, actualStatus: number, callingMethod: Function) {
        if (expectedStatus !== actualStatus) {
            // Retrieve recent request/response logs for context
            const logs = this.logger.getRecentLogs();
            // Build error message with expected vs actual status and full logs
            const error = new Error(`Expected status ${expectedStatus}, but got ${actualStatus}\n\nRecent API Logs:\n\n${logs}`);
            // Clean stack trace by excluding this validator from the trace
            Error.captureStackTrace(error, callingMethod)
            throw error
        }
    }

    private getHeaders() {
        if (!this.clearAuthFlag) {
            this.apiHeaders['Authorization'] = this.apiHeaders['Authorization'] || this.defaultAuthToken
        }
        return this.apiHeaders

    }
    private cleanupFields() {
        this.baseUrl = undefined
        this.apiPath = ''
        this.queryParams = {}
        this.apiHeaders = {}
        this.apiBody = {}
        this.clearAuthFlag = false
    }

}   