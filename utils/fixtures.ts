import { test as base } from '@playwright/test'
import { RequestHandler } from '../utils/request-handler'
import { APILogger } from '../utils/logger'

export type TestOptions = {
    api: RequestHandler;        
}

export const test = base.extend<TestOptions>({
    api: async({request}, use)  => {
        const baseUrl = 'https://conduit-api.bondaracademy.com/api'
        const logger = new APILogger()
        const requestHandler = new RequestHandler(request, logger, baseUrl)
        await use(requestHandler)
    }
})