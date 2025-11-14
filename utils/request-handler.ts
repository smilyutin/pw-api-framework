import { APIRequestContext } from "@playwright/test"
import { expect } from '@playwright/test'
import { APILogger } from "./logger"

export class RequestHandler {

    private request: APIRequestContext | undefined
    private logger: APILogger
    private baseUrl: string | undefined
    private defaultBaseUrl: string | undefined
    private apiPath: string | undefined
    private queryParams: object = {}
    private apiHeaders: Record<string, string> = {}
    private apiBody: object = {}

    constructor(request: APIRequestContext, logger: APILogger, baseUrl: string) {
        this.request = request
        this.defaultBaseUrl = baseUrl
        this.logger = logger
    }

    url(url: string) {
        this.baseUrl = url;
        return this;
    }

    path(path: string) {
        this.apiPath = path;
        return this;
    }

    params(params: object) {
        this.queryParams = params;
        return this;
    }

    headers(headers: Record<string, string>) {
        this.apiHeaders = headers;
        //console.log(this.apiHeaders);
        return this;
    }
    body(body: object) {
        this.apiBody = body
        return this;
    }

    async getRequest(statusCode: number) {
        const url = this.getURL()
        this.logger?.logRequest('GET', url, this.apiHeaders)
        const response = await this.request?.get(url, {
            headers: this.apiHeaders,
        })
        const actualStatus = response?.status()!
        const responseJSON = await response?.json()
        this.logger.logResponse(actualStatus, {}, responseJSON)
        this.statusCodeValidator(statusCode, actualStatus, this.getRequest)
  

       return responseJSON
    }

    async postRequest(statusCode: number) {
        const url = this.getURL()
        this.logger?.logRequest('POST', url, this.apiHeaders, this.apiBody)
        const response = await this.request?.post(url, {
            headers: this.apiHeaders,
            data: this.apiBody
        })
        const actualStatus = response?.status()!
        const responseJSON = await response?.json()
        this.logger.logResponse(actualStatus, {}, responseJSON)
        this.statusCodeValidator(statusCode, actualStatus, this.postRequest)

        return responseJSON
    }

    async putRequest(statusCode: number) {
        const url = this.getURL()
        this.logger?.logRequest('PUT', url, this.apiHeaders, this.apiBody)
        const response = await this.request?.put(url, {
            headers: this.apiHeaders,
            data: this.apiBody
        })

        const actualStatus = response?.status()!
        const responseJSON = await response?.json()
        this.logger.logResponse(actualStatus, {}, responseJSON)
        this.statusCodeValidator(statusCode, actualStatus, this.putRequest)


        return responseJSON
    }

    async deleteRequest(statusCode: number) {
        const url = this.getURL()
        this.logger.logRequest('DELETE', url, this.apiHeaders)
        const response = await this.request?.delete(url, {
            headers: this.apiHeaders
        })
        const actualStatus = response?.status()!
        this.logger.logResponse(actualStatus, {}, undefined)
        this.statusCodeValidator(statusCode, actualStatus, this.deleteRequest)
    }
    private getURL() {
        const url = new URL(`${this.baseUrl ?? this.defaultBaseUrl}${this.apiPath}`)
        for (const [key, value] of Object.entries(this.queryParams)) {
            url.searchParams.append(key, value);

        }
        console.log(url.toString());
        return url.toString();
    }

    private statusCodeValidator(expectedStatus: number, actualStatus: number, callingMethod: Function) {
        if (expectedStatus !== actualStatus) {
            const logs = this.logger.getRecentLogs();
            const error = new Error(`Expected status ${expectedStatus}, but got ${actualStatus}\n\nRecent API Logs:\n\n${logs}`);
            Error.captureStackTrace(error, callingMethod);
            throw error
        }
    }

}   