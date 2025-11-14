# pw-api-framework

Lightweight Playwright API testing framework with fluent request builder, custom expectations, secure logging, and CI pipelines.

## Capabilities
- **Fluent API client**: `RequestHandler` supports `.url() .path() .params() .headers() .body()` with `getRequest|postRequest|putRequest|deleteRequest`.
- **Secure logger**: `APILogger` redacts secrets (Authorization, tokens, passwords) from headers/bodies and prints recent logs on failures.
- **Custom matchers**: `expect` extensions like `shouldEqual`, `shouldBeLessThanOrEqual` for readable assertions.
- **Fixtures**: Shared `api` fixture configured in `utils/fixtures`.
- **Single worker**: Configured for deterministic API tests.
- **CI ready**: Workflows for smoke tests, secret scanning (Gitleaks), and workflow linting (actionlint).
- **MCP configs**: JSON/YAML examples with local schema mapping for editor validation.

## Prerequisites
- Node.js 20+
- macOS/Linux shell (`zsh` supported)
- Optional: `gitleaks` for local secret scanning, `actionlint` for local workflow linting

## Install
```bash
npm ci
```

## Run Tests (Local)
- **All tests**:
```bash
npx playwright test
```
- **Smoke only**:
```bash
npx playwright test tests/smokeTest.spec.ts --reporter=line
```
- **Filter by title**:
```bash
npx playwright test -g "Get Articles"
```
- **Open last HTML report**:
```bash
npx playwright show-report
```

## Build/Verify
- **Install Playwright browsers**:
```bash
npx playwright install --with-deps
```
- **Secret scan (local)**:
```bash
gitleaks detect --source . --redact -v -c .gitleaks.toml
```
- **Workflow lint (local)**:
```bash
actionlint
```

## CI/CD
- `.github/workflows/smoke-tests.yml`:
	- Triggers: push to `main`, PRs `dev` → `main`.
	- Runs Playwright smoke: `tests/smokeTest.spec.ts` and uploads report artifact.
- `.github/workflows/gitleaks.yml`:
	- Runs Gitleaks via Docker, emits `gitleaks.sarif`.
	- Uploads to Code Scanning on same-repo events; uploads artifact on fork PRs.
- `.github/workflows/actionlint.yml`:
	- Validates workflow YAML on PRs/pushes to `main`.

## Security & Secrets
- No tokens committed. Configs reference env vars (e.g., `GITHUB_TOKEN`).
- Logger masks secrets automatically in console output and error logs.
- Pre-commit hook runs Gitleaks and blocks commits that leak secrets.

Set a token for local use (if required by tools):
```bash
export GITHUB_TOKEN=ghp_your_token
```

## MCP Configs
- JSON: `mcp-servers.json` with `$schema: ./schemas/mcp-servers.v1.json`.
- YAML: `mcp-servers.yaml` equivalent.
- VS Code mapping: `.vscode/settings.json` maps the local schema for validation.

## Troubleshooting
- Schema 404s: ensured by local schema `schemas/mcp-servers.v1.json`.
- Code scanning upload fails on fork PRs: SARIF is uploaded as an artifact instead.
- Husky notice: current pre-commit works; remove legacy header if upgrading to Husky v10.

