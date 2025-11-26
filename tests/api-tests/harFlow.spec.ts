import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'
import { faker } from '@faker-js/faker'
import articleRequestPayload from '../../request-objects/POST-article.json'

test('HAR Flow - Article Creation and Comment Workflow', async ({ api }) => {
    // Step 1: Create article
    const articleRequest = structuredClone(articleRequestPayload)
    articleRequest.article.title = faker.lorem.words(5)
    articleRequest.article.description = faker.lorem.sentence(3)
    articleRequest.article.body = faker.lorem.paragraph(8)

    const createArticleResponse = await api
        .path('/articles/')
        .body(articleRequest)
        .postRequest(201)
    await expect(createArticleResponse).shouldMatchSchema('articles', 'POST_articles')
    const articleSlug = createArticleResponse.article.slug

    // Step 2: Get created article by slug
    const getArticleBySlugResponse = await api
        .path(`/articles/${articleSlug}`)
        .getRequest(200)
    await expect(getArticleBySlugResponse).shouldMatchSchema('articles', 'GET_articles_slug')
    expect(getArticleBySlugResponse.article.title).shouldEqual(articleRequest.article.title)

    // Step 3: Get comments for the article
    const getCommentsResponse = await api
        .path(`/articles/${articleSlug}/comments`)
        .getRequest(200)
    await expect(getCommentsResponse).shouldMatchSchema('articles', 'GET_articles_slug_comments')


    // Step 4: Add comment to the article
    const commentRequest = {
        comment: {
            body: faker.lorem.sentence(2)
        }
    }
    const createCommentResponse = await api
        .path(`/articles/${articleSlug}/comments`)
        .body(commentRequest) 
        .postRequest(200)
    await expect(createCommentResponse).shouldMatchSchema('articles', 'POST_articles_slug_comments')

    // Step 5: Get comments again to validate comment was added
    const getCommentsAfterCreateResponse = await api
        .path(`/articles/${articleSlug}/comments`)
        .getRequest(200)
    await expect(getCommentsAfterCreateResponse).shouldMatchSchema('articles', 'GET_articles_slug_comments')
    expect(getCommentsAfterCreateResponse.comments.length).shouldEqual(1)
    expect(getCommentsAfterCreateResponse.comments[0].body).shouldEqual(commentRequest.comment.body)

})
