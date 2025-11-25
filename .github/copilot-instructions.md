# Copilot Instructions for Playwright API and UI Testing Framework

<!-- Write automated test in Playwright following these guidelines:
- Follow Playwright with XState best practices
- Do not add comments to each line of code
- Write only the Playwright test steps for the scenario
- Read and analyze the provided DOM context from the browser
- Use DOM Relationships, if no stable attribute exists, use hierarchical or relative locators
- Create one test at a time unless specifically asked for multiple tests
- Prioritize ‘getByRole()’ ‘getByText()’ selectors over ‘locator()’ when possible
- Keep test code clean and focused on the test scenario
- Don’t add assertions unless asked
- For the random test data, keep it short and compact. Don’t write long texts
- Use async/await syntax for asynchronous operations
- Use POM structure, utilise Config Manager, Driver Factory, Test Utilities, Fixtures, and other design patterns where applicable
- Use TypeScript features effectively, including types and interfaces
- Ensure tests are maintainable and scalable
- Avoid hardcoding values; use variables or constants where appropriate
- Follow the AAA (Arrange, Act, Assert) pattern in test structure
- Ensure proper error handling and reporting in tests
- Optimize test execution time without compromising reliability
- Use Playwright’s built-in features for parallelism and retries where applicable
- Keep accessibility in mind while writing tests
- Ensure tests are idempotent and can be run multiple times without side effects
- Follow the project’s coding standards and conventions
- Ensure tests are compatible with CI/CD pipelines
- Regularly review and refactor tests to maintain quality and relevance
- Stay updated with the latest Playwright with XState features and best practices -->
## Project Overview
This is a Playwright-based API testing framework designed for testing REST APIs with features including custom matchers, schema validation and authentication handling.

## Key Technologies & Dependencies
- **Playwright Test**: Main testing framework (`@playwright/test`)
- **TypeScript**: Primary language
- **AJV**: JSON schema validation (`ajv`, `ajv-formats`)
- **Genson-JS**: Automatic schema generation (`genson-js`)

## Project Structure

```
├── api-test.config.ts      # Environment configuration
├── helpers/                # Utility helper functions
│   └── createToken.ts      # Authentication token creation
├── request-objects/        # JSON objects for API requests
│   └── [endpoint]/         # Organized by API endpoint
├── response-schemas/       # JSON schemas for API response validation
│   └── [endpoint]/         # Organized by API endpoint
├── tests/                  # Tests folder
│   └── *.spec.ts           # Test files
└── utils/                  # Core utilities
    ├── custom-expect.ts    # Custom Playwright matchers
    ├── fixtures.ts         # Test fixtures and setup
    ├── logger.ts           # API request/response logging
    ├── request-handler.ts  # Fluent API request builder
    └── schema-validator.ts # JSON schema validation logic
```

## Core Patterns & Conventions

### 1. Request Handler Pattern
The `RequestHandler` class provides a fluent API for building HTTP requests:

```typescript
// Standard pattern for API calls
const response = await api
    .path('/endpoint')
    .body({ data: 'value' })
    .headers({ 'Custom-Header': 'value' })
    .params({ limit: 10 })
    .postRequest(201)
```

**Key methods:**
- `.path(string)` - Set API endpoint path
- `.body(object)` - Set request body
- `.headers(object)` - Set custom headers
- `.params(object)` - Set query parameters
- `.url(string)` - Override base URL
- `.clearAuth()` - Remove authentication
- `.getRequest(expectedStatus)` - Execute GET
- `.postRequest(expectedStatus)` - Execute POST
- `.putRequest(expectedStatus)` - Execute PUT
- `.deleteRequest(expectedStatus)` - Execute DELETE

### 2. Custom Expect Matchers
Use custom matchers for assertions.

Examples:
```typescript
// Schema validation
await expect(response).shouldMatchSchema('articles', 'GET_articles')

// Value comparison with API logging
expect(response.title).shouldEqual('Expected Title')
expect(response.count).shouldBeLessThanOrEqual(100)
```

### 3. Test Structure Pattern
```typescript
import { test } from '../utils/fixtures'
import { expect } from '../utils/custom-expect'

test('Test Description', async ({ api }) => {
    // Test implementation using the api fixture
});
```

### 4. Authentication Pattern
- Authentication token is automatically created as a worker-scoped fixture
- Token is included in all requests by default
- Use `.clearAuth()` to remove authentication for specific requests

### 5. Schema Validation Pattern
- Schema files are generated automatically
- Schemas stored in `response-schemas` folder
- `shouldMatchSchema(dirName, fileName)` is a method for schema validation
- To generate or update schema from responses set third artument `createSchemaFlag: true`. Example: `await expect(response).shouldMatchSchema('articles', 'GET_articles', true)`

## Common Development Patterns

### When Creating New Tests
- Import test fixture and custom expect
- Use the `api` fixture for requests
- Validate every reponse with schema matching
- Use custom matchers for assertions
- Single test can have a sequence of several API requests
- Use camel case for constant names
- Assign API response to the constant
- Do not assign response for `deleteRequest()`

### When creating POST or PUT requests
- Save request objects into [request-objects](../request-objects) folder
- Request object file naming pattern `[method]-[endpoint].json`
- Import request object file into the test. Example: `import articleRequestPayload from '../request-objects/POST-article.json'`
- Create a clone of imported request object for every test that needs it using `structuredClone()`. Example: `const articleRequest = structuredClone(articleRequestPayload)`
- Use request object file as argument in `body()` methods. Example: `.body(articleRequest)`

## Example Test Template

```typescript
import { test } from '../utils/fixtures'
import { expect } from '../utils/custom-expect'

test('Example API Test', async ({ api }) => {
    const createResponse = await api
        .path('/resource')
        .body({ name: 'Test Resource' })
        .postRequest(201)
    await expect(createResponse).shouldMatchSchema('resource', 'POST_resource')
    expect(createResponse.name).shouldEqual('Test Resource')
    
    const getResponse = await api
        .path('/resource')
        .params({ id: createResponse.id })
        .getRequest(200)
    await expect(getResponse).shouldMatchSchema('resource', 'GET_resource')
    
    await api
        .path(`/resource/${createResponse.id}`)
        .deleteRequest(204)
})
```