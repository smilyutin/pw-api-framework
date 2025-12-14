# pw-api-framework

Lightweight Playwright API testing framework for fast, maintainable HTTP contract and functional testing with schema validation, secure logging, and CI workflows.

## Features
- **Fluent Request Builder**: Chain `.url().path().params().headers().body()` then call `getRequest|postRequest|putRequest|deleteRequest`.
- **Schema Validation**: JSON responses validated with Ajv; optional auto-generation & regeneration of JSON schemas.
- **Auto Timestamp Formats**: On schema (re)generation, `createdAt` and `updatedAt` fields are injected with `format: "date-time"` (if string / no existing format).
- **HAR Processing**: Convert Playwright HAR recordings into automated API test flows with schema validation.
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
pw-api-framework/
├── .github/
│   ├── agents/                     # GitHub Copilot agents
│   │   ├── 🎭 generator.agent.md   # Test generation agent
│   │   ├── 🎭 healer.agent.md      # Test debugging/fixing agent
│   │   └── 🎭 planner.agent.md     # Test planning agent
│   ├── instructions/               # Framework patterns and rules
│   ├── prompts/                    # Test generation prompts
│   └── workflows/                  # GitHub Actions CI/CD
├── helpers/
│   ├── createToken.ts              # Token generation helper
│   └── ui-helpers.ts               # UI test utilities
├── mcp-audit-logs/                 # MCP tool invocation audit logs
├── metrics/                        # Performance metrics storage
├── request-objects/                # JSON request templates for POST/PUT
├── responce-schemas/               # Generated JSON schemas
│   ├── articles/                   # Article-related schemas
│   ├── profiles/                   # Profile-related schemas
│   └── tags/                       # Tag-related schemas
├── schemas/                        # Configuration schemas (MCP, etc.)
├── tests/
│   ├── api-tests/                  # API test specifications
│   │   ├── example.spec.ts
│   │   ├── harFlow.spec.ts
│   │   ├── negativeTests.spec.ts
│   │   ├── seed.spec.ts
│   │   ├── smokeTest.spec.ts
│   │   └── tokenReplayFuzzTest.spec.ts
│   ├── ui-tests/                   # UI/E2E test specifications
│   │   └── smokeTest.spec.ts
│   ├── approval-handler.spec.ts    # MCP security tests
│   ├── artifact-security.spec.ts
│   ├── audit-logger.spec.ts
│   └── token-validator.spec.ts
├── utils/
│   ├── approval-handler.ts         # MCP action approval logic
│   ├── artifact-security.ts        # Artifact security validation
│   ├── audit-logger.ts             # MCP audit logging
│   ├── custom-expect.ts            # Custom matchers
│   ├── data-generator.ts           # Test data generation utilities
│   ├── fixtures.ts                 # Playwright fixtures
│   ├── logger.ts                   # Secure logging
│   ├── performance-metrics.ts      # Performance measurement utilities
│   ├── request-handler.ts          # Fluent HTTP builder
│   ├── schema-validator.ts         # Ajv validation + schema generation
│   └── token-validator.ts          # Token validation utilities
├── api-test.config.ts              # Environment configuration
├── har-converter.js                # HAR file filtering utility
├── mcp-servers.json                # MCP server configuration
├── mcp-servers.yaml                # MCP server configuration (YAML)
├── playwright.config.ts            # Runner configuration
├── CODE_SCANNING.md                # Security scanning documentation
├── MCP_SECURITY_INTEGRATION.md     # MCP security integration guide
├── PERFORMANCE_METRICS.md          # Performance metrics documentation
└── architecture.md                 # Architecture documentation
```

## Adding New API Tests
1. Create spec in `tests/` (e.g. `userProfile.spec.ts`)
2. Use `api` fixture to build requests
3. Capture JSON response
4. Call `validateSchema('users','GET_user_schema', body, true)` first time to generate
5. Flip flag back to `false` for subsequent contract validation

## Generating Tests from HAR Files
The framework includes a workflow to convert Playwright HAR recordings into automated test flows:

1. **Record HAR file** during UI testing (Playwright automatically saves HAR files during trace recording)
2. **Filter HAR file** to keep only API requests:
```bash
node har-converter.js
```
This creates `filtered-har.json` with only relevant API calls.

3. **Generate test from HAR** using the prompt instructions:
   - Follow `.github/prompts/generate-test-from-har.prompt.md`
   - Creates complete test with schema validation
   - Uses `structuredClone()` pattern for request objects
   - Generates dynamic test data with Faker.js
   - Extracts values for dependent requests (slugs, IDs, etc.)

See `.github/instructions/har-processing.instructions.md` for detailed patterns and conventions.

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
