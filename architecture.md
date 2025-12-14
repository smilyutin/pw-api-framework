# Architecture Documentation

## Overview

This is a Playwright-based API testing framework designed for testing REST APIs with a focus on maintainability, reusability, and schema validation.

## Project Structure

```
pw-api-framework/
├── .github/
│   ├── agents/                 # GitHub Copilot agents
│   │   ├── 🎭 generator.agent.md   # Test generation agent
│   │   ├── 🎭 healer.agent.md      # Test debugging/fixing agent
│   │   └── 🎭 planner.agent.md     # Test planning agent
│   ├── instructions/           # Copilot instruction files
│   ├── prompts/                # Copilot prompt templates
│   └── workflows/              # GitHub Actions CI/CD
├── helpers/
│   ├── createToken.ts          # Authentication token creation
│   └── ui-helpers.ts           # UI test utilities
├── mcp-audit-logs/             # MCP tool invocation audit logs
├── metrics/                    # Performance metrics storage
├── request-objects/            # Request payload templates (e.g., POST-article.json)
├── responce-schemas/           # JSON schemas for API response validation
│   ├── articles/               # Article-related schemas
│   ├── profiles/               # Profile-related schemas
│   └── tags/                   # Tag-related schemas
├── schemas/                    # Configuration schemas (MCP, etc.)
├── tests/
│   ├── api-tests/              # API test specifications
│   │   ├── example.spec.ts
│   │   ├── harFlow.spec.ts
│   │   ├── negativeTests.spec.ts
│   │   ├── seed.spec.ts
│   │   ├── smokeTest.spec.ts
│   │   └── tokenReplayFuzzTest.spec.ts
│   ├── ui-tests/               # UI/E2E test specifications
│   │   └── smokeTest.spec.ts
│   ├── approval-handler.spec.ts    # MCP security tests
│   ├── artifact-security.spec.ts
│   ├── audit-logger.spec.ts
│   └── token-validator.spec.ts
├── utils/
│   ├── approval-handler.ts     # MCP action approval logic
│   ├── artifact-security.ts    # Artifact security validation
│   ├── audit-logger.ts         # MCP audit logging
│   ├── custom-expect.ts        # Custom assertion matchers
│   ├── data-generator.ts       # Test data generation utilities
│   ├── fixtures.ts             # Custom Playwright fixtures
│   ├── logger.ts               # API request/response logging
│   ├── performance-metrics.ts  # Performance measurement utilities
│   ├── request-handler.ts      # Fluent API request builder
│   ├── schema-validator.ts     # JSON schema validation
│   └── token-validator.ts      # Token validation utilities
├── api-test.config.ts          # Environment configuration
├── har-converter.js            # HAR to test converter
├── mcp-servers.json            # MCP server configuration
├── mcp-servers.yaml            # MCP server configuration (YAML)
├── playwright.config.ts        # Playwright configuration
├── CODE_SCANNING.md            # Security scanning documentation
├── MCP_SECURITY_INTEGRATION.md # MCP security integration guide
├── PERFORMANCE_METRICS.md      # Performance metrics documentation
└── architecture.md             # This file
```

## Core Components

### 1. Custom Fixtures (`utils/fixtures.ts`)

Provides reusable test context including:
- `api`: API client with fluent interface for making requests
- `config`: Configuration settings (base URL, credentials, etc.)

### 2. Custom Expectations (`utils/custom-expect.ts`)

Extended assertion library with custom matchers:
- `shouldMatchSchema()`: Validates response against JSON schemas
- `shouldEqual()`: Enhanced equality assertions
- `shouldBeLessThanOrEqual()`: Numeric comparisons
- `not.shouldEqual()`: Negative assertions

### 3. Data Generator (`utils/data-generator.ts`)

Generates randomized test data using Faker.js:
- `getNewRandomArticle()`: Creates article payloads with random data
- Ensures test data uniqueness and reduces test coupling

### 4. Schema Validation

Automated JSON schema validation:
- Validates API responses match expected structure
- Can auto-generate schemas from responses (when flag is set to `true`)
- Organized by resource type (articles, tags, etc.)

## API Client Pattern

The framework uses a fluent API client interface:

```typescript
await api
    .path('/endpoint')
    .headers({ Authorization: token })
    .params({ limit: 10 })
    .body(requestPayload)
    .postRequest(201)
```

### Supported Methods:
- `getRequest(expectedStatus)`
- `postRequest(expectedStatus)`
- `putRequest(expectedStatus)`
- `deleteRequest(expectedStatus)`

### Optional Methods:
- `path(url)`: Set the endpoint path
- `headers(obj)`: Add custom headers
- `params(obj)`: Add query parameters
- `body(obj)`: Set request body
- `clearAuth()`: Remove authentication headers

## Test Patterns

### Standard Test Flow

1. **Arrange**: Prepare test data using data generators or request templates
2. **Act**: Make API request using fluent interface
3. **Assert**: 
   - Validate response schema
   - Assert business logic expectations
   - Verify state changes

### Example Pattern: CRUD Operations

```typescript
// Create
const articleRequest = getNewRandomArticle()
const createResponse = await api
    .path('/articles')
    .body(articleRequest)
    .postRequest(201)
await expect(createResponse).shouldMatchSchema('articles', 'POST_articles_schema')

// Read/Verify
const getResponse = await api
    .path('/articles')
    .params({ limit: 10, offset: 0 })
    .getRequest(200)
expect(getResponse.articles[0].title).shouldEqual(articleRequest.article.title)

// Update
const updateRequest = { ...articleRequest, article: { ...articleRequest.article, title: 'New Title' } }
const updateResponse = await api
    .path(`/articles/${slug}`)
    .body(updateRequest)
    .putRequest(200)
await expect(updateResponse).shouldMatchSchema('articles', 'PUT_articles_schema')

// Delete
await api
    .path(`/articles/${slug}`)
    .deleteRequest(204)

// Verify deletion
const verifyResponse = await api
    .path('/articles')
    .getRequest(200)
expect(verifyResponse.articles[0].title).not.shouldEqual(articleRequest.article.title)
```

## Authentication Strategy

The framework supports multiple authentication approaches:
- Token-based authentication via headers
- Pre-configured tokens in fixtures
- Dynamic token generation (see commented examples in tests)
- `clearAuth()` method to remove authentication when needed

```typescript
// Example authentication patterns:
await api
    .path('/endpoint')
    .headers({ Authorization: authToken })
    .getRequest(200)
```

## Configuration Management

- Centralized configuration through fixtures
- Environment-specific settings accessible via `config` fixture
- HTTP headers configured at test or suite level using `test.use()`

```typescript
test.use({
    extraHTTPHeaders: {
        // Custom headers for all tests in this suite
    }
});
```

## Schema Management

Schemas are organized by:
- **Resource type**: articles, tags, users, etc.
- **HTTP method**: GET, POST, PUT, DELETE
- Auto-generation capability for rapid schema creation

```typescript
// Validate with existing schema
await expect(response).shouldMatchSchema('articles', 'GET_articles_schema')

// Auto-generate/update schema (third parameter = true)
await expect(response).shouldMatchSchema('tags', 'GET_tags_schema', true)
```

## Best Practices

1. **Use data generators** instead of hardcoded test data (e.g., `getNewRandomArticle()`)
2. **Validate schemas** for every response to catch API contract changes
3. **Clean up test data** using create → verify → delete pattern
4. **Use descriptive test names** that explain the test scenario
5. **Group related tests** using test suites
6. **Leverage fixtures** for common setup and teardown
7. **Comment out debugging code** rather than deleting it for future reference

## Extensibility Points

1. **Custom matchers**: Add new assertions in `custom-expect.ts`
2. **Data generators**: Create resource-specific generators in `data-generator.ts`
3. **Fixtures**: Extend with additional test context
4. **Request templates**: Add JSON templates in `request-objects/` for new endpoints
5. **Schema validators**: Implement custom validation logic

## Testing Workflow

1. Write test using fluent API client
2. Execute test to generate baseline response
3. Auto-generate schema from response (set third parameter to `true`)
4. Refine schema for stricter validation
5. Set schema generation flag to `false`
6. Run tests in CI/CD pipeline

## Dependencies

- **Playwright**: Test runner and API client
- **Faker.js** (`@faker-js/faker`): Random data generation
- **JSON Schema Validator**: Response validation
- **TypeScript**: Type safety and developer experience

## Common Patterns from Tests

### Query Parameters
```typescript
.params({ limit: 10, offset: 0 })
```

### Dynamic Slug/ID Handling
```typescript
const slugID = response.article.slug
await api.path(`/articles/${slugID}`).deleteRequest(204)
```

### Deep Copy Request Objects
```typescript
const articleRequest = JSON.parse(JSON.stringify(articleRequestPayload))
articleRequest.article.title = "New Title"
```

### Negative Assertions
```typescript
expect(response.articles[0].title).not.shouldEqual(deletedTitle)
```
