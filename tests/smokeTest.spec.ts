import { test } from '../utils/fixtures';

test('first test', async ({ api }) => {
    const url = api
        //.url('https://condui.com/api')
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        .headers({ Authorization: 'authToken' })
        .body({ user: { email: '1pwtest101@test.com', password: '1pwtest101@test.com' } })
});