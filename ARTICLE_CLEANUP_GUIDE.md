# Article Cleanup Strategy

## Overview
Every Playwright test that creates an article now includes cleanup guarantees to prevent hanging articles in the system.

## Implementation Strategy

### 1. API Tests (using custom fixtures)

**Files affected:**
- `tests/api-tests/smokeTest.spec.ts`
- `tests/api-tests/harFlow.spec.ts`

**Mechanism:**
- Tests use the `test` fixture from `utils/fixtures.ts`
- Access to `articleCleanup` fixture for tracking created articles
- Each test that creates an article calls:
  - `articleCleanup.setApi(api)` - Set the API handler
  - `articleCleanup.track(slug)` - Track the article slug
- Automatic cleanup via `test.afterEach()` hook in the fixture definition
- Safety net: If explicit cleanup fails, the fixture's afterEach hook will attempt cleanup

**Example:**
```typescript
test('Create and Delete Article', async ({ api, articleCleanup }) => {
    const createArticleResponse = await api
        .path('/articles')
        .body(articleRequest)
        .postRequest(201)
    
    const slug = createArticleResponse.article.slug
    articleCleanup.setApi(api)
    articleCleanup.track(slug)
    
    // ... test assertions ...
    
    // Explicit deletion (if desired)
    await api
        .path(`/articles/${slug}`)
        .deleteRequest(204)
    
    // Automatic fallback cleanup runs regardless
})
```

### 2. UI Tests (using custom fixtures)

**Files affected:**
- `tests/ui-tests/smokeTest.spec.ts`

**Mechanism:**
- Tests use the `test` fixture from `utils/fixtures.ts`
- Each test that creates an article:
  - Receives `api` and `articleCleanup` fixtures
  - Calls `articleCleanup.setApi(api)` after signing in
  - Calls `articleCleanup.track(article.slug)` after creating article
- Automatic cleanup via `test.afterEach()` hook in the test describe block
- Hook runs after every test, cleaning up any tracked articles

**Example:**
```typescript
test('Create and delete article', async ({ page, config, api, articleCleanup }) => {
    await signIn(page, credentials, config.uiUrl)
    
    const article = await createArticle(page)
    articleCleanup.setApi(api)
    articleCleanup.track(article.slug!)
    
    // ... test assertions ...
    
    // Explicit deletion via UI (if test completes successfully)
    await page.getByRole('button', { name: 'Delete Article' }).click()
    
    // Automatic cleanup runs regardless
})
```

### 3. Legacy Tests (using raw Playwright)

**Files affected:**
- `tests/api-tests/example.spec.ts`

**Mechanism:**
- Tests use raw Playwright `@playwright/test`
- Each test manually deletes articles at the end
- No automatic fallback (design choice to keep tests independent)
- Each test is responsible for its own cleanup

**Example:**
```typescript
test('create and delete article', async ({ request }) => {
    const newArticleResponse = await request.post(url, { ... })
    const slug = newArticleResponse.article.slug
    
    // ... test assertions ...
    
    const deleteArticleResponse = await request.delete(url + slug, { ... })
    expect(deleteArticleResponse.status()).toEqual(204)
})
```

## Cleanup Flow Diagram

### API Tests with Fixture
```
Test starts
    ↓
Create article + track(slug)
    ↓
Test assertions
    ↓
Explicit deletion (optional)
    ↓
Test ends
    ↓
afterEach hook runs
    ↓
articleCleanup.cleanupAll() 
    ↓
Verify article deleted (if not already deleted)
    ↓
Test complete
```

### UI Tests
```
Test starts
    ↓
Sign in + set API
    ↓
Create article + track(slug)
    ↓
Test assertions
    ↓
Delete article via UI (optional)
    ↓
Test ends
    ↓
test.afterEach() hook in describe block
    ↓
articleCleanup.cleanupAll()
    ↓
Verify article deleted via API
    ↓
Test complete
```

## Safety Guarantees

1. **Explicit Cleanup First**: Tests attempt to delete articles explicitly for normal flow
2. **Automatic Fallback**: If test fails before explicit cleanup, fixture cleanup runs
3. **Idempotent Deletion**: Cleanup gracefully handles already-deleted articles
4. **Tracked Articles Only**: Only articles explicitly tracked via `articleCleanup.track()` are cleaned up
5. **Error Handling**: Cleanup errors are logged but don't fail tests

## Verification

Run tests with verbose output to verify cleanup:
```bash
npx playwright test --reporter=verbose
```

Monitor test output for cleanup confirmations:
```
✓ test completes
✓ afterEach hook runs
✓ article cleanup initiated for tracked slugs
```

## Best Practices

1. **Always track articles**: If you create an article in a test, call `articleCleanup.track(slug)`
2. **Keep explicit cleanup**: Even though automatic cleanup exists, maintain explicit cleanup in tests
3. **Use proper fixtures**: Use `test` from `utils/fixtures.ts` for new tests
4. **Test failure scenarios**: Ensure cleanup works even when assertions fail

## Migration Guide

### To convert a test to use automatic cleanup:

1. Change import from `@playwright/test` to fixtures:
   ```typescript
   import { test } from '../../utils/fixtures'
   ```

2. Add `articleCleanup` parameter to test:
   ```typescript
   test('my test', async ({ api, articleCleanup }) => {
   ```

3. Track created articles:
   ```typescript
   articleCleanup.setApi(api)
   articleCleanup.track(article.slug)
   ```

4. Keep explicit cleanup for normal flow (optional but recommended)

5. Automatic cleanup now runs as safety net
