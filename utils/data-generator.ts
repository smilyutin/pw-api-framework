import { faker } from '@faker-js/faker'
import articleRequestPayload from '../request-objects/POST-article.json'


export function getNewRandomArticle() {
    //const articleRequest = JSON.parse(JSON.stringify(articleRequestPayload))
    const articleRequest = structuredClone(articleRequestPayload)
    articleRequest.article.title = faker.lorem.sentence(5)
    articleRequest.article.description = faker.lorem.sentences(5)
    articleRequest.article.body = faker.lorem.paragraphs(8)
    return articleRequest
}