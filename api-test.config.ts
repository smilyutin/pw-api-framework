import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const processENV = process.env.TEST_ENV
const env = processENV || 'dev'
console.log(`Running tests on the ${env} environment`)

const config = {
    apiUrl : 'https://conduit-api.bondaracademy.com/api',
    uiUrl : 'https://conduit.bondaracademy.com',
    userEmail : '1pwtest101@test.com',
    userPassword : '1pwtest101@test.com'
}

if(env === 'dev'){
    config.apiUrl = 'https://conduit-api.bondaracademy.com/api';
    if(!process.env.DEV_USERNAME || !process.env.DEV_PASSWORD) {
        throw Error('DEV_USERNAME and DEV_PASSWORD must be set in environment variables');
    }
    config.userEmail = process.env.DEV_USERNAME 
    config.userPassword = process.env.DEV_PASSWORD
}
if(env === 'prod'){
    config.apiUrl = 'https://conduit-api.bondaracademy.com/api';
    if(!process.env.PROD_USERNAME || !process.env.PROD_PASSWORD) {
        throw Error('PROD_USERNAME and PROD_PASSWORD must be set in environment variables');
    }
    config.userEmail = process.env.PROD_USERNAME 
    config.userPassword = process.env.PROD_PASSWORD
}

//run in cmd TEST_ENV='qa' npx playwright test smokeTest.spec.ts

export {config}