import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'
import { faker } from '@faker-js/faker'
import articleRequestPayload from '../../request-objects/POST-article.json'
import { getNewRandomArticle } from '../../utils/data-generator';
// import { validateSchema } from '../utils/schema-validator'
//import { createToken } from '../helpers/createToken'

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
        // console.log(response)
    //use schema validation after every single response
    await expect(response).shouldMatchSchema('articles', 'GET_articles')
    // expect(response.articles.length).shouldBeLessThanOrEqual(10)
    // expect(response.articlesCount).shouldEqual(10)

    // Verify slug matches the title format (title with spaces replaced by "-" and number at the end)
    response.articles.forEach((article: any) => {
        // Convert title to expected slug format: keep colons/apostrophes/periods, replace spaces with -, add number
        const cleanTitle = article.title
            .replace(/[^\w\s:'.-]/g, '')  // Remove unwanted punctuation (keep : ' . -)
            .replace(/\s+/g, '-')         // Replace spaces with hyphens
        
        // Escape special regex characters in the title
        const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        expect(article.slug).toMatch(new RegExp(`^${escapedTitle}-\\d+$`))
    })

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
    await expect(response).shouldMatchSchema('tags', 'GET_tags')
    // await expect(response).shouldMatchSchema('tags', 'GET_tags_schema', true)
    // remove true to catch schema errors, set to true to create/update the schema file
    expect(response.tags[0]).shouldEqual('Test')
    expect(response.tags.length).toBeLessThanOrEqual(10)
})
test('Create and Delete Article', async ({ api }) => {
    //
    // const articleRequest = JSON.parse(JSON.stringify(articleRequestPayload))
    // articleRequest.article.title = "Object title"
    const articleRequest = getNewRandomArticle()
    const createArticleResponse = await api
        .path('/articles')
        // .headers({ Authorization: authToken })
        .body(articleRequest)
        .postRequest(201)
    await expect(createArticleResponse).shouldMatchSchema('articles', 'POST_articles')
    expect(createArticleResponse.article.title).shouldEqual(articleRequest.article.title)
    const slagID = createArticleResponse.article.slug
    const articlesResponse = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    await expect(articlesResponse).shouldMatchSchema('articles', 'GET_articles')
    expect(articlesResponse.articles[0].title).shouldEqual(articleRequest.article.title);

    await api
        .path(`/articles/${slagID}`)
        // .headers({ Authorization: authToken })
        .deleteRequest(204)

    const articlesResponseCheck = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    await expect(articlesResponseCheck).shouldMatchSchema('articles', 'GET_articles')
    expect(articlesResponseCheck.articles[0].title).not.shouldEqual(articleRequest.article.title)
})

test('Create, Update and Delete Article', async ({ api }) => {
    const articleTitle = faker.lorem.sentence(3)
    const articleRequest = JSON.parse(JSON.stringify(articleRequestPayload))
    articleRequest.article.title = articleTitle

    const createArticleResponse = await api
        .path('/articles')
        // .headers({ Authorization: authToken })
        .body(articleRequest)
        .postRequest(201)
    await expect(createArticleResponse).shouldMatchSchema('articles', 'POST_articles')
    expect(createArticleResponse.article.title).shouldEqual(articleTitle);
    const slagID = createArticleResponse.article.slug

    const articleTitleNew = faker.lorem.sentence(3)
    articleRequest.article.title = articleTitleNew
    const updateArticleResponse = await api
        .path(`/articles/${slagID}`)
        // .headers({ Authorization: authToken })
        .body(articleRequest)
        .putRequest(200)
    await expect(updateArticleResponse).shouldMatchSchema('articles', 'PUT_articles')
    expect(updateArticleResponse.article.title).shouldEqual(articleTitleNew)
    const newSlagID = updateArticleResponse.article.slug

    const articlesResponse = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    await expect(articlesResponse).shouldMatchSchema('articles', 'GET_articles')
    expect(articlesResponse.articles[0].title).shouldEqual(articleTitleNew)


    await api
        .path(`/articles/${newSlagID}`)
        // .headers({ Authorization: authToken })
        .deleteRequest(204)

    const articlesResponseCheck = await api
        .path('/articles')
        .params({ limit: 10, offset: 0 })
        // .headers({ Authorization: authToken })
        .getRequest(200)
    await expect(articlesResponseCheck).shouldMatchSchema('articles', 'GET_articles')
    expect(articlesResponseCheck.articles[0].title).not.shouldEqual(articleTitleNew);
})
