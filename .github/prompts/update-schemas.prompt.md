# Custom Prompt: Auto-Update Failed Schema Validations

Automatically fix schema validation failures by reading the test output and updating only the failed `shouldMatchSchema()` calls.
Follow the schema validation instruction: [schema-validation](../instructions/schema-validation.instructions.md)

## Task:
1. Run tests using: `npx playwright test` terminal command
2. Read the terminal output to identify schema validation failures
3. Parse failure messages to extract:
   - Test file names with schema validation failures
   - Specific `shouldMatchSchema()` calls that failed
4. Update only those failed schema validations by adding `true` as third argument
5. Run tests again to regenerate schemas and verify fixes
6. Remove the `true` flag from all `shouldMatchSchema()` that were updated on step 4
7. Run tests again to validate all tests should pass

## Pattern Recognition:
Look for error patterns like:
- "Error: Schema validation [filename]_schema.json failed"
- Test file paths in stack traces. Example: `tests/smokeTest.spec.ts:8:5 › Get Articles`
- `shouldMatchSchema()` method calls in error output

## Implementation:
```typescript
// Only change failed validations from:
await expect(response).shouldMatchSchema('articles', 'GET_articles')
// To:
await expect(response).shouldMatchSchema('articles', 'GET_articles', true)
```

## Requirements:
- Read and analyze the complete terminal output provided
- Only modify schema validations that actually failed
- Leave successful schema validations untouched
- Target specific test files mentioned in failures