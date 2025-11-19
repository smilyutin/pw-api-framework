import { test } from '../utils/fixtures'
import { expect } from '../utils/custom-expect'
import { validateSchema } from '../utils/schema-validator'
import { createToken } from '../helpers/createToken'

test.use({
    extraHTTPHeaders: {

    }
});


// let authToken: string;

// test.beforeAll('Get token', async ({ api, config }) => {
//     // const tokenSerponse = await api
//     //     .path('/users/login')
//     //     .body({ "user": { "email": config.userEmail, "password": config.userPassword } })
//     //     .postRequest(200)
//     // authToken = 'Token ' + tokenSerponse.user.token;
//     // console.log(tokenSerponse.user)
//     authToken = await createToken('1pwtest101@dev.com', '1pwtest101@dev.com');
// });
test('Get Articles', async ({ api }) => {
    const response = await api
        .path('/articles')
        // .headers({ Authorization: authToken })
        .params({ limit: 10, offset: 0 })
        // .clearAuth()
        .getRequest(200)
    await expect(response).shouldMatchSchema('articles', 'GET_articles_schema', true)
    expect(response.articles.length).shouldBeLessThanOrEqual(10)
    expect(response.articlesCount).shouldEqual(10)
//commit test
    // const response2 = await api
    //     .path('/tags')
    //     .getRequest(200)
    // await validateSchema('tags', 'GET_tags_schema')
    // expect(response.tags[0]).shouldEqual('Test')
    // expect(response.tags.length).toBeLessThanOrEqual(10)
})

test('Get Test Tags', async ({ api }) => {
    const response = await api
        .path('/tags')
        .getRequest(200)
    await expect(response).shouldMatchSchema('tags', 'GET_tags_schema')
    // await expect(response).shouldMatchSchema('tags', 'GET_tags_schema', true)
    // remove true to catch schema errors, set to true to create/update the schema file
    expect(response.tags[0]).shouldEqual('Test')
    expect(response.tags.length).toBeLessThanOrEqual(10)
})
test('Create and Delete Article', async ({ api }) => {
    const createArticleResponse = await api
        .path('/articles')
        // .headers({ Authorization: authToken })
        .body({ "article": { "title": "Title", "description": "New About", "body": "My big fat article here", "tagList": ["My Tags"] } })
        .postRequest(201)
        await expect(createArticleResponse).shouldMatchSchema('articles', 'POST_articles_schema')
    expect(createArticleResponse.article.title).shouldEqual("Title");
    const slagID = createArticleResponse.article.slug
    const articlesResponse = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    expect(articlesResponse.articles[0].title).shouldEqual("Title");

    await api
        .path(`/articles/${slagID}`)
        // .headers({ Authorization: authToken })
        .deleteRequest(204)

    const articlesResponseCheck = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    expect(articlesResponseCheck.articles[0].title).not.shouldEqual("Title");
})

test('Create, Update and Delete Article', async ({ api }) => {
    const createArticleResponse = await api
        .path('/articles')
        // .headers({ Authorization: authToken })
        .body({ "article": { "title": "Title New", "description": "New About", "body": "My big fat article here", "tagList": ["My Tags"] } })
        .postRequest(201)
        await expect(createArticleResponse).shouldMatchSchema('articles', 'POST_articles_schema')
    expect(createArticleResponse.article.title).shouldEqual("Title New");
    const slagID = createArticleResponse.article.slug

    const updateArticleResponse = await api
        .path(`/articles/${slagID}`)
        // .headers({ Authorization: authToken })
        .body({ "article": { "title": "Title New Updated", "description": "Updated About", "body": "My big updatedfat article here", "tagList": ["My updatedTags"] } })
        .putRequest(200)
        await expect(updateArticleResponse).shouldMatchSchema('articles', 'PUT_articles_schema')
    expect(updateArticleResponse.article.title).shouldEqual("Title New Updated")
    const newSlagID = updateArticleResponse.article.slug

    const articlesResponse = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    expect(articlesResponse.articles[0].title).shouldEqual("Title New Updated");

    await api
        .path(`/articles/${newSlagID}`)
        // .headers({ Authorization: authToken })
        .deleteRequest(204)

    const articlesResponseCheck = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    expect(articlesResponseCheck.articles[0].title).not.shouldEqual("Title New updated");
})
