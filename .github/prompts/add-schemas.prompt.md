# Custom Prompt: Add Schema Validation

Add `shouldMatchSchema()` validation to all API requests in this file that return responses. 
Follow the schema validation instruction: [schema-validation](../instructions/schema-validation.instructions.md)

## Task:
- Add schema validation to GET, POST, PUT requests (skip DELETE)
- Set third argument to `true` for new schema generation
- Skip requests that already have schema validation
- Follow the naming conventions from the custom instruction

## Example:
```typescript
const response = await api
    .path('/articles')
    .getRequest(200)
await expect(response).shouldMatchSchema('articles', 'GET_articles', true)
```