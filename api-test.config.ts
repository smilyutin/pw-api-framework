
const processENV = process.env.TEST_ENV
const env = processENV || ''
console.log(`Running tests on the ${env} environment`)

const config = {
    apiUrl : 'https://conduit-api.bondaracademy.com/api',
    userEmail : '1pwtest101@test.com',
    userPassword : '1pwtest101@test.com'
}

if(env === 'qa'){
    config.apiUrl ='https://conduit-api.bondaracademy.com/api',
    config.userEmail = '1pwtest101@qa.com',
    config.userPassword = '1pwtest101@qa.com'
}
if(env === 'dev'){
    config.apiUrl ='https://conduit-api.bondaracademy.com/api',
    config.userEmail = '1pwtest101@dev.com',
    config.userPassword = '1pwtest101@dev.com'
}

//run in cmd TEST_ENV='qa' npx playwright test smokeTest.spec.ts

export {config}