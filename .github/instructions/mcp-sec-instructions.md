# MCP Security Instructions & Operational Guidance for Playwright Automation

This document defines **mandatory security and governance rules** for
any automation project using **Playwright with MCP and LLMs**.

------------------------------------------------------------------------

## 1. LLM Must Be Treated as Untrusted

-   Never trust prompts
-   Never trust tool selection
-   Never trust tool arguments
-   Always enforce RBAC and least privilege

------------------------------------------------------------------------

## 2. Environment Separation (Critical)

-   Dev, QA, Staging, and Prod must be physically separated
-   MCP cannot access Production without explicit approval
-   Playwright must use environment-bound configuration files

------------------------------------------------------------------------

## 3. Tool Permission Model (RBAC)

Each MCP-exposed Playwright tool must define:
- Allowed roles
- Allowed actions
- Read vs write permissions
- Rate limits
- Data sensitivity level

### Capability Firewall Implementation

**Configuration Location:** `mcp-servers.json` and `mcp-servers.yaml`

Each MCP server must include a `security.capabilityFirewall` section:

```json
{
  "security": {
    "capabilityFirewall": {
      "allowedActions": ["readRepo", "searchCode", "listIssues"],
      "blockedActions": ["deleteRepo", "deleteFile", "pushCode"],
      "requireApproval": ["createIssue", "commentPull"],
      "allowedEnvironments": ["development", "test", "staging"]
    }
  }
}
```

**Action Validation Logic:**
1. Check if action is in `blockedActions` → **BLOCK**
2. Check if environment is in `allowedEnvironments` → **BLOCK if not**
3. Check if action requires approval → **BLOCK and request approval**
4. Check if action is in `allowedActions` → **ALLOW**
5. Default → **BLOCK** (fail-safe)

**Implementation:** Use `utils/audit-logger.ts` `AuditLogger.validateAction()` method

No implicit permissions are allowed.

------------------------------------------------------------------------

## 4. API Hard Scoping

-   No wildcard endpoints
-   No cross-tenant access
-   Every request must be identity-bound
-   Enforce strict OpenAPI schema validation

------------------------------------------------------------------------

## 5. Human-in-the-Loop Enforcement

Mandatory approval is required for:
- Data deletion
- Credential rotation
- Payment processing
- Privileged account creation
- Repository modifications
- Production deployments

### Approval Handler Implementation

**Configuration Location:** `mcp-servers.json` security section

```json
{
  "security": {
    "approvalHandler": {
      "enabled": true,
      "interface": "cli",
      "timeout": 300,
      "allowedApprovers": ["${APPROVER_EMAIL}"]
    }
  }
}
```

**Interface Options:**
- `cli`: Interactive command-line approval (immediate, synchronous)
- `web`: Web-based approval UI (future implementation)
- `api`: External approval service integration (future implementation)

**Usage Example:**

```typescript
import { ApprovalHandler, withApproval } from '../utils/approval-handler';

const handler = new ApprovalHandler({
  enabled: true,
  interface: 'cli',
  timeout: 300,
  allowedApprovers: ['admin@example.com']
});

// Wrap destructive actions with approval requirement
const result = await withApproval(
  handler,
  'user@example.com',
  'production',
  'github',
  'deleteFile',
  { path: 'sensitive/data.json', repo: 'my-repo' },
  'critical',
  'Removing deprecated configuration file',
  async () => {
    // Execute the actual destructive action
    return await deleteFile({ path: 'sensitive/data.json' });
  }
);
```

**Approval Flow:**
1. System detects action requires approval (from `requireApproval` list)
2. Displays approval request with full context (user, action, parameters, risk)
3. Waits for human approval within timeout period
4. Logs approval decision to `mcp-audit-logs/approvals.jsonl`
5. Executes action only if approved
6. Throws error if rejected or timeout

**Auto-Approval:** Configure `autoApproveEnvironments: ['development']` to skip approval for dev

------------------------------------------------------------------------

## 6. Tool Execution Firewall

Before any MCP-triggered Playwright execution: - Validate command
intent - Validate environment - Validate data classification - Validate
test impact scope Fail closed by default.

------------------------------------------------------------------------

## 7. MCP + Playwright Audit Logging

**All MCP tool invocations must be logged with:**
- Timestamp (ISO 8601 format)
- Session ID (unique per session)
- User/Actor identity
- Environment (development/test/staging/production)
- Tool name and action
- Input parameters (sanitized)
- Result status (success/failure/blocked)
- Risk level (low/medium/high/critical)
- Duration (ms)
- Reason for failure/block

### Audit Log Implementation

**Configuration:** Enable in `mcp-servers.json`:

```json
{
  "security": {
    "auditLogging": {
      "enabled": true,
      "logDirectory": "./mcp-audit-logs",
      "retentionDays": 90
    }
  }
}
```

**Log Format:** JSONL (one JSON object per line)

**Log Location:** `./mcp-audit-logs/mcp-audit-YYYY-MM-DD.jsonl`

**Usage Example:**

```typescript
import { AuditLogger, withAudit } from '../utils/audit-logger';

const logger = new AuditLogger({
  allowedActions: ['readRepo', 'searchCode'],
  blockedActions: ['deleteRepo'],
  requireApproval: ['createIssue'],
  allowedEnvironments: ['development', 'test']
});

// Wrap any MCP tool invocation
const result = await withAudit(
  logger,
  'github',
  'searchCode',
  { query: 'test', repo: 'my-repo' },
  'user@example.com',
  'development',
  async () => {
    // Execute the actual tool
    return await githubSearchCode({ query: 'test' });
  }
);
```

**Daily Reports:** Automatically generated at `./mcp-audit-logs/daily-report-YYYY-MM-DD.txt`

**Anomaly Detection:** Monitors for:
- High rate of blocked actions (>10/hour)
- Multiple failures in short time (>5/hour)
- Critical risk actions
- Production environment access

**Security Summary:** Call `logger.getSecuritySummary(24)` for metrics

------------------------------------------------------------------------

## 8. Token Scope Validation

**All GitHub tokens must be validated to ensure least privilege:**

### Token Validation Configuration

**Configuration Location:** `mcp-servers.json` security section

```json
{
  "security": {
    "tokenValidation": {
      "enabled": true,
      "requiredScopes": ["repo"],
      "maxScopes": ["repo", "read:org", "write:discussion"],
      "validateOnStartup": true
    }
  }
}
```

**Validation Process:**
1. Calls GitHub API to verify token authenticity
2. Extracts granted scopes from `X-OAuth-Scopes` header
3. Checks for required scopes (must have)
4. Checks for excessive scopes (must not have)
5. Validates against least privilege principle

**Implementation:**

```typescript
import { TokenValidator, validateTokenOnStartup } from '../utils/token-validator';

// Validate on server startup
await validateTokenOnStartup({
  enabled: true,
  requiredScopes: ['repo'],
  maxScopes: ['repo', 'read:org'],
  validateOnStartup: true
});

// Or validate manually
const validator = new TokenValidator(config);
const result = await validator.validateGitHubToken(process.env.GITHUB_TOKEN!);

if (!result.valid) {
  console.error('Token validation failed:', result.errors);
  process.exit(1);
}
```

**Validation Output:**

```
 GitHub Token Validation Report
Status:  VALID
Token Hash: a3f2c1b9e8d7f6e5

Detected Scopes (2):
  • repo - Full control of private repositories
  • read:org - Read org and team membership
```

**Excessive Scope Detection:**

If token has more permissions than needed:
```
  Excessive Scopes Detected (3):
  • admin:org - Full control of orgs and teams
  • delete_repo - Delete repositories
  • workflow - Update GitHub Action workflows

  WARNING: Token has more permissions than required!
```

**Recommended Token Scopes:**
- **Read-only operations:** `repo` (read access) or `public_repo`
- **Issue/PR comments:** `repo` + `write:discussion`
- **Organization access:** `read:org`
- **Never grant:** `admin:org`, `delete_repo`, `workflow`, `write:packages`

**Security Benefits:**
- Prevents over-privileged tokens from causing damage
- Detects compromised or misconfigured tokens
- Enforces principle of least privilege
- Provides audit trail of token usage
- Alerts on token expiration or rate limit issues

------------------------------------------------------------------------

## 9. Secure Test Artifacts

**All test artifacts must be sanitized to prevent data exposure:**

### Artifact Security Configuration

**Configuration Location:** `mcp-servers.json` security section

```json
{
  "security": {
    "artifactSecurity": {
      "enabled": true,
      "redactPatterns": [
        "ghp_.*",
        "ghs_.*",
        "github_pat_.*",
        "Bearer\\s+[a-zA-Z0-9\\-._~+/]+=*",
        ".*token.*",
        ".*secret.*",
        ".*password.*"
      ],
      "maxArtifactSize": 10485760,
      "allowedFileTypes": ["json", "txt", "log", "md", "har", "png", "jpg"],
      "encryptSensitiveData": false,
      "sanitizeMetadata": true,
      "sanitizeScreenshots": true,
      "sanitizeTraces": true,
      "sanitizeHAR": true
    }
  }
}
```

**Implementation:**

```typescript
import { ArtifactSecurityManager, PlaywrightArtifactSecurity } from '../utils/artifact-security';

// Initialize artifact security
const artifactSecurity = new ArtifactSecurityManager({
  enabled: true,
  redactPatterns: ['ghp_.*', '.*token.*', '.*secret.*', '.*password.*'],
  sanitizeMetadata: true,
  maxArtifactSize: 10485760 // 10MB
});

// Redact text content
const result = artifactSecurity.redactText(responseBody);
console.log('Redacted:', result.redactionCount, 'patterns');
console.log('Safe:', result.isSafe);

// Redact JSON objects
const { redacted } = artifactSecurity.redactJSON(apiResponse);

// Sanitize metadata
const safeMetadata = artifactSecurity.sanitizeMetadata(metadata);
```

**Playwright Integration:**

```typescript
import { PlaywrightArtifactSecurity } from '../utils/artifact-security';

const playwrightSecurity = new PlaywrightArtifactSecurity(config);

// Sanitize HAR files before saving
test('save sanitized HAR', async ({ page }) => {
  const har = await page.context().storageState();
  const sanitizedHAR = playwrightSecurity.sanitizeHAR(har);
  await fs.writeFile('sanitized.har', JSON.stringify(sanitizedHAR));
});

// Sanitize trace data
const trace = await getTraceData();
const sanitizedTrace = playwrightSecurity.sanitizeTraceData(trace);
```

**Automatic Redaction Patterns:**

| Pattern | Description | Replacement |
|---------|-------------|-------------|
| `ghp_[a-zA-Z0-9]{36}` | GitHub PAT | `[REDACTED-GITHUB-TOKEN]` |
| `ghs_[a-zA-Z0-9]{36}` | GitHub Secret | `[REDACTED-GITHUB-SECRET]` |
| `github_pat_[a-zA-Z0-9_]{82}` | GitHub Fine-grained PAT | `[REDACTED-GITHUB-PAT]` |
| `Bearer [...]` | Bearer Token | `Bearer [REDACTED]` |
| `password: "..."` | Password | `"password": "[REDACTED]"` |
| `api_key: "..."` | API Key | `"api_key": "[REDACTED]"` |
| `-----BEGIN PRIVATE KEY-----` | Private Key | `[REDACTED-PRIVATE-KEY]` |
| `\d{3}-\d{2}-\d{4}` | SSN | `[REDACTED-SSN]` |
| `\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}` | Credit Card | `[REDACTED-CREDIT-CARD]` |

**Security Requirements:**
- ✅ Screenshots must not expose PII
- ✅ Traces must mask secrets and tokens
- ✅ HAR files must be sanitized (headers, cookies, post data)
- ✅ CI logs must not contain credentials
- ✅ Metadata sanitization for all artifacts
- ✅ File size and type validation

**Artifact Size Limits:**
- GitHub server: 10MB (10485760 bytes)
- GitHub-search server: 5MB (5242880 bytes)

**Allowed File Types:**
- Logs: `.json`, `.txt`, `.log`, `.md`
- Archives: `.har`
- Images: `.png`, `.jpg`

------------------------------------------------------------------------

## 10. Continuous Red Team & Abuse Testing

Security tests must include:
- Prompt injection into test flows
- Tool confusion attacks
- API abuse via Playwright
- Multi-step autonomous execution chains
- Environment escape attempts

------------------------------------------------------------------------

## 11. Supply Chain Security

-   Enforce signed Playwright plugins
-   Lock dependency versions
-   Monitor npm registry for compromised packages
-   Validate third-party MCP tool sources

------------------------------------------------------------------------

## 12. Incident Response Readiness

You must maintain:
- Tamper-proof execution logs
- Real-time anomaly detection
- Automated MCP behavior alerts

------------------------------------------------------------------------

## 13. Zero Trust Operating Model (Playwright + MCP)

-   Every test execution is verified
-   Every tool call is scoped
-   Every API request is gated
-   Every high-risk workflow requires approval

------------------------------------------------------------------------

## Implementation Summary

### Required Security Components

1. **Capability Firewall** (`utils/audit-logger.ts`)
   - Action allowlist/blocklist
   - Environment restrictions
   - Approval requirements

2. **Audit Logging** (`utils/audit-logger.ts`)
   - All MCP invocations tracked
   - Daily reports and anomaly detection
   - 90-day retention

3. **Human-in-Loop** (`utils/approval-handler.ts`)
   - CLI/Web/API approval interfaces
   - Timeout enforcement
   - Approval audit trail

4. **Token Validation** (`utils/token-validator.ts`)
   - Scope verification on startup
   - Least privilege enforcement
   - Excessive permission detection

5. **Artifact Security** (`utils/artifact-security.ts`)
   - Automatic sensitive data redaction
   - HAR/trace/screenshot sanitization
   - File size and type validation
   - Metadata sanitization

### Configuration Checklist

- [ ] Set `GITHUB_TOKEN` environment variable (repo:read scope only)
- [ ] Set `NODE_ENV` environment variable (development/test/staging/production)
- [ ] Set `APPROVER_EMAIL` for approval notifications (optional)
- [ ] Enable audit logging in `mcp-servers.json`
- [ ] Configure capability firewall rules
- [ ] Enable token validation with `validateOnStartup: true`
- [ ] Define approval requirements for destructive actions
- [ ] Enable artifact security with redaction patterns
- [ ] Set artifact size limits (10MB for github, 5MB for github-search)
- [ ] Configure allowed file types for artifacts
- [ ] Set up log retention and monitoring
- [ ] Review and adjust timeout values
- [ ] Test approval workflow in development environment
- [ ] Verify artifact sanitization in CI/CD pipelines