import { config } from '../api-test.config';
import { RequestHandler } from '../utils/request-handler';
import { APILogger } from '../utils/logger';
import { request } from '@playwright/test';

export async function createToken(email: string, password: string) {
    const conext = await request.newContext();
    const logger = new APILogger()
    const api = new RequestHandler(conext, logger, config.apiUrl)

    try {
        const tokenRerponse = await api
            .path('/users/login')
            .body({ "user": { "email": email, "password": password } })
            .postRequest(200)
        return 'Token ' + tokenRerponse.user.token;
    } catch (error) {
        if (error instanceof Error) {
            Error.captureStackTrace(error, createToken);
        }
        throw error;
    } finally {
        await conext.dispose();
    }
}