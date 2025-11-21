# pw-api-framework

Lightweight Playwright API testing framework for fast, maintainable HTTP contract and functional testing with schema validation, secure logging, and CI workflows.

## Features
- **Fluent Request Builder**: Chain `.url().path().params().headers().body()` then call `getRequest|postRequest|putRequest|deleteRequest`.
- **Schema Validation**: JSON responses validated with Ajv; optional auto-generation & regeneration of JSON schemas.
- **Auto Timestamp Formats**: On schema (re)generation, `createdAt` and `updatedAt` fields are injected with `format: "date-time"` (if string / no existing format).
- **Custom Expectations**: Extended `expect` matchers (e.g. `shouldEqual`, `shouldBeLessThanOrEqual`) for readable assertions.
- **Secure Logging**: Logger redacts sensitive headers (Authorization, tokens, passwords).
- **Playwright Fixtures**: Shared `api` context fixture for consistent request handling.
- **Deterministic Runs**: Single worker configuration to avoid race conditions with test data.
- **CI Ready**: Smoke test workflow, secret scanning (Gitleaks), workflow linting (actionlint).
- **Schema Mapping**: Local MCP schema examples in JSON & YAML with validation via `$schema`.
- **Extensible Utilities**: Helpers for token creation, request handling, logging, and schema generation.

## Tech Stack
- **Runtime**: Node.js 20+
- **Test Runner**: Playwright
- **Schema**: Ajv + ajv-formats + genson-js (generation)
- **Lang**: TypeScript
- **Security**: Gitleaks, masked logs

## Installation
```bash
npm ci
```

(Optional) Install Playwright browsers:
```bash
npx playwright install --with-deps
```

## Running Tests
- All tests:
```bash
npx playwright test
```
- Single file:
```bash
npx playwright test tests/smokeTest.spec.ts
```
- By title (grep):
```bash
npx playwright test -g "Get Articles"
```
- With concise reporter:
```bash
npx playwright test --reporter=line
```
- View last HTML report:
```bash
npx playwright show-report
```

## Schema Validation Workflow
Schemas live under `./responce-schemas/<group>/<NAME>.json`.

Core function `validateSchema`:
```ts
await validateSchema(
  'articles',          // directory
  'GET_articles_schema', // file base name WITHOUT .json
  responseBody,        // actual API JSON
  false                 // set true to (re)generate schema
)
```

### Regenerating / Creating Schemas
Set `createSchemaFlag` to `true` when calling `validateSchema` in a test after verifying the response structure is stable:
```ts
await validateSchema('articles', 'GET_articles_schema', responseBody, true)
```
This will:
1. Generate a new schema via `genson-js`
2. Traverse schema and inject `format: "date-time"` for `createdAt` / `updatedAt` properties where `type` is (or becomes) `string`
3. Save schema to disk (creating directories recursively)

### Auto Timestamp Format Rules
- Applies only when generating (flag `true`)
- Does not overwrite an existing `format`
- Handles nested objects, arrays, and composed schemas (`anyOf|oneOf|allOf`)

## Project Structure (Key Files)
```
helpers/createToken.ts            // Token generation helper
utils/request-handler.ts          // Fluent HTTP builder
utils/logger.ts                   // Secure logging
utils/fixtures.ts                 // Playwright fixtures
utils/schema-validator.ts         // Ajv validation + schema generation + date-time injection
utils/custom-expect.ts            // Custom matchers
responce-schemas/                 // Generated JSON schemas
tests/*.spec.ts                   // Playwright API specs
playwright.config.ts              // Runner configuration
```

## Adding New API Tests
1. Create spec in `tests/` (e.g. `userProfile.spec.ts`)
2. Use `api` fixture to build requests
3. Capture JSON response
4. Call `validateSchema('users','GET_user_schema', body, true)` first time to generate
5. Flip flag back to `false` for subsequent contract validation

## Custom Expectations Example
```ts
expect(status).shouldEqual(200)
expect(latencyMs).shouldBeLessThanOrEqual(500)
```

## Logging Behavior
- Redacts `authorization`, `token`, `password` keys (case-insensitive)
- Prints recent request log batch on failure for easier triage

## CI Workflows
- `smoke-tests.yml`: Runs `tests/smokeTest.spec.ts`, publishes Playwright report artifact
- `codeql.yml`: CodeQL static analysis for security vulnerabilities (enables GitHub Code Scanning)
- `gitleaks.yml`: Secret scanning, SARIF upload (code scanning on same-repo events)
- `actionlint.yml`: Workflow syntax validation

For detailed information on enabling and using GitHub Code Scanning, see [CODE_SCANNING.md](CODE_SCANNING.md).

## Security & Secrets
Set env locally:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```
Run secret scan:
```bash
gitleaks detect --source . --redact -v
```

## Troubleshooting
- Schema validation fails: Inspect thrown error (Ajv error array + actual body). Update schema via regen flag if response format legitimately changed.
- Missing date-time `format`: Ensure regeneration flag was `true` at least once after adding field.
- Inconsistent test data: Run with single worker (default) to avoid shared-state collisions.
- Gitleaks false positives: Add inline allowlist in `.gitleaks.toml` (keep minimal).

## Conventions
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:` etc.)
- Avoid manual edits to generated schema fields for timestamps—regenerate instead.
- Use TypeScript explicit types for new utilities.

## Migration
- Previous configs could use both `servers` and `mcpServers`. The schema now requires only `servers` and removes `mcpServers`.
- If you still have `mcpServers` in a local file, rename the key to `servers` and merge entries.
- Version field must follow semantic version pattern `MAJOR.MINOR.PATCH` (e.g. `1.0.0`). Update older numeric versions accordingly.
- Capabilities are now validated against a fixed enum; remove or adjust any custom capability names not in the list.
- Metadata no longer allows arbitrary extra keys; add a separate `notes` entry at the root if you need free-form comments.

## Next Ideas
- Add `deletedAt` to auto format list
- Introduce response snapshot diffing
- Add resilience tests (retry/backoff simulation)

## License
Internal / Not publicly licensed (adjust if open-sourcing).
