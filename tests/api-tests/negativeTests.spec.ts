import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'


[
    { username: "dd", usernameErrorMessage: "is too short (minimum is 3 characters)" },
    { username: "ddd", usernameErrorMessage: "" },
    { username: "dddddddddddddddddddd", usernameErrorMessage: "" },
    { username: "ddddddddddddddddddddd", usernameErrorMessage: "is too long (maximum is 20 characters)" }
].forEach(({ username, usernameErrorMessage }) => {
    test(`Create User with invalid username: ${username}`, async ({ api }) => {
        const newUserResponse = await api
            .path('/users')
            .body({
                "user": {
                    "email": "invalid-email-format",
                    "password": "s",
                    "username": username
                }
            })
            .clearAuth()
            .postRequest(422)
        if (username.length == 3 || username.length == 20) {
            expect(newUserResponse.errors)
        } else {

            expect(newUserResponse.errors.username[0]).shouldEqual(usernameErrorMessage)
        }
        //await expect(newUserResponse).shouldMatchSchema('users', 'POST_users_error_schema')
        // console.log(newUserResponse)
    })
})
