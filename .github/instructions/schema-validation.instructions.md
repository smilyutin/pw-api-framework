---
applyTo: "api-tests/*.spec.ts"
---

# Custom Instruction: Schema Validation for API Testing

## Overview
This instruction defines the standard approach for implementing schema validation in our Playwright API testing framework.

## Schema Validation Rules

### When to Apply Schema Validation
- **REQUIRED**: Add schema validation to ALL API requests that return a response body
- **EXCLUDE**: DELETE requests (no response body expected)
- **SKIP**: API requests that already have `shouldMatchSchema()` assertions

### Method Usage: `shouldMatchSchema()`

The `shouldMatchSchema()` method accepts three arguments:

#### Argument 1: Folder Name (string, required)
- Rule: Must match the API endpoint name
- Format: Extract from endpoint path, remove leading slash
- Examples:
  - Endpoint: `/articles` → Folder: `"articles"`
  - Endpoint: `/tags` → Folder: `"tags"`

#### Argument 2: File Name (string, required)
- Format: `"[REQUEST_TYPE]_[endpoint]"`
- REQUEST_TYPE: HTTP method in uppercase (GET, POST, PUT)
- endpoint: Same as folder name plus additional path keys if exists
- Examples:
  - GET `/articles` → `"GET_articles"`
  - POST `/tags` → `"POST_tags"`
  - PUT `/users` → `"PUT_users"`
  - GET `/articles/${slugId}/comments` → `"GET_articles_comments"`
  - POST `/articles/${slugId}/comments` → `"POST_articles_comments"`

#### Argument 3: Generate Schema Flag (boolean, optional)
- Default value: `false`
- To auto-generate or update schema: Set to `true`

### Implementation Pattern

```typescript
const response = await api
    .path('/endpoint')
    .method(expectedStatusCode)
await expect(response).shouldMatchSchema('folder_name', 'METHOD_endpoint', true)
```

### Code Placement
- Add schema validation **immediately after** the API request
- Place **before** any other response assertions
- Use **async/await** syntax with the `expect()` call


## Examples

```typescript
// GET request example
const getResponse = await api
    .path('/articles')
    .getRequest(200)
await expect(getResponse).shouldMatchSchema('articles', 'GET_articles', true)

// POST request example  
const postResponse = await api
    .path('/users/login')
    .body({ user: { email: 'test@test.com', password: 'password' } })
    .postRequest(201)
await expect(postResponse).shouldMatchSchema('users', 'POST_users', true)

// PUT request example
const putResponse = await api
    .path('/articles/123')
    .body({ article: { title: 'Updated Title' } })
    .putRequest(200)
await expect(putResponse).shouldMatchSchema('articles', 'PUT_articles', true)

// DELETE request - NO schema validation needed
await api
    .path('/articles/123')
    .deleteRequest(204)
// No schema validation for DELETE requests
```