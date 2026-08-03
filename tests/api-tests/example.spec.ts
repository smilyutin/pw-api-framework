import { test, expect } from '@playwright/test';
let authToken: string;

test.beforeAll('Run before all tests', async ({request}) => {
  const tokenResponse = await request.post('https://conduit-api.bondaracademy.com/api/users/login', {
    data: { "user": { "email": "1pwtest101@test.com", "password": "1pwtest101@test.com" } }
  });
  const tokenResponseJSON = await tokenResponse.json();
  authToken = 'Token ' + tokenResponseJSON.user.token;
})

// test.afterAll('Run after all tests', async ({}) => {
//   console.log('Executed after all tests');
// })

test('GET test tags', async ({ request }) => {
  const tagsResponse = await request.get('https://conduit-api.bondaracademy.com/api/tags')
  const tagsResponseJSON = await tagsResponse.json();

  expect(tagsResponse.status()).toBe(200);
  expect(tagsResponse.ok()).toBeTruthy();
  expect(tagsResponseJSON.tags[0]).toEqual('Test')
  expect(tagsResponseJSON.tags.length).toBeLessThanOrEqual(10);
  //console.log(tagsResponseJSON);
});

test('GET list of articles', async ({ request }) => {
  const articlesResponse = await request.get('https://conduit-api.bondaracademy.com/api/articles?limit=10&offset=0')
  const articlesResponseJSON = await articlesResponse.json();

  expect(articlesResponse.status()).toBe(200);
  expect(articlesResponse.ok()).toBeTruthy();
  // expect(articlesResponseJSON.tags[0]).toEqual('Articles')
  expect(articlesResponseJSON.articles.length).toBeLessThanOrEqual(10);
  expect(articlesResponseJSON.articlesCount).toEqual(10)
  //console.log(articlesResponseJSON);
});


test('create and delete article', async ({ request }) => {
  // console.log(authToken);

  const newArticleResponse = await request.post('https://conduit-api.bondaracademy.com/api/articles', {
    data: {
      "article": {
        "title": "Title New",
        "description": "New About",
        "body": "My big fat article here",
        "tagList": ["My Tags"]
      }
    },
    headers: {
      Authorization: authToken
    }
  })
  const newArticleResponseJSON = await newArticleResponse.json();
  // console.log(newArticleResponseJSON);
  expect(newArticleResponse.status()).toEqual(201);
  expect(newArticleResponseJSON.article.title).toEqual("Title New");
  const slagID = newArticleResponseJSON.article.slug;

  const articlesResponse = await request.get('https://conduit-api.bondaracademy.com/api/articles?limit=10&offset=0', {
    headers: {
      Authorization: authToken
    }
  });
  const articlesResponseJSON = await articlesResponse.json();
  expect(articlesResponse.status()).toEqual(200);
  expect(articlesResponseJSON.articles[0].title).toEqual("Title New");

  const deleteArticleResponse = await request.delete(`https://conduit-api.bondaracademy.com/api/articles/${slagID}`, {
    headers: {
      Authorization: authToken
    }
  });
  expect(deleteArticleResponse.status()).toEqual(204);
})

test('create, update and delete article', async ({ request }) => {
    // console.log(authToken);
  const uniqueTitle = `Test new article ${Date.now()}`;

  const newArticleResponse = await request.post('https://conduit-api.bondaracademy.com/api/articles', {
    data: {
      "article": {
        "title": uniqueTitle,
        "description": "New About",
        "body": "My big fat article here",
        "tagList": ["My Tags"]
      }
    },
    headers: {
      Authorization: authToken
    }
  })
  const newArticleResponseJSON = await newArticleResponse.json();
  expect(newArticleResponse.status()).toEqual(201);
  expect(newArticleResponseJSON.article.title).toEqual(uniqueTitle);
  const slagID = newArticleResponseJSON.article.slug;

  const modifiedTitle = `${uniqueTitle} Modified`;
  const updateArticleResponse =  await request.put(`https://conduit-api.bondaracademy.com/api/articles/${slagID}`, {
    data: {
      "article": {
        "title": modifiedTitle,
        "description": "New Test About",
        "body": "My big fat test article here",
        "tagList": ["My Tags"]
      }
    },
    headers: {
      Authorization: authToken
    }
  });

  const updateArticleResponseJSON = await updateArticleResponse.json();
  expect(updateArticleResponse.status()).toEqual(200);
  expect(updateArticleResponseJSON.article.title).toEqual(modifiedTitle);
  const updateSlagID = updateArticleResponseJSON.article.slug;
  
  const articlesResponse = await request.get('https://conduit-api.bondaracademy.com/api/articles?limit=10&offset=0', {
    headers: {
      Authorization: authToken
    }
  });
  const articlesResponseJSON = await articlesResponse.json();
  expect(articlesResponse.status()).toEqual(200);
  expect(articlesResponseJSON.articles[0].title).toEqual(modifiedTitle);

  const deleteArticleResponse = await request.delete(`https://conduit-api.bondaracademy.com/api/articles/${updateSlagID}`, {
    headers: {
      Authorization: authToken
    }
  });
  expect(deleteArticleResponse.status()).toEqual(204);
})