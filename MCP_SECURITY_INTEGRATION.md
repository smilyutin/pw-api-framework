# MCP Security Integration Example

This document demonstrates how to use all MCP security components together.

## Complete Security Stack

1. **Token Validation** - Verify GitHub token scopes
2. **Capability Firewall** - Restrict allowed actions
3. **Audit Logging** - Track all invocations
4. **Human-in-Loop** - Require approval for destructive actions

## Setup

### 1. Environment Variables

```bash
export GITHUB_TOKEN=ghp_your_token_here
export NODE_ENV=development
export APPROVER_EMAIL=admin@example.com
```

### 2. Validate Token on Startup

```typescript
import { validateTokenOnStartup } from './utils/token-validator';

// Validate before initializing MCP servers
await validateTokenOnStartup({
  enabled: true,
  requiredScopes: ['repo'],
  maxScopes: ['repo', 'read:org', 'write:discussion'],
  validateOnStartup: true
});
```

### 3. Initialize Security Components

```typescript
import { AuditLogger } from './utils/audit-logger';
import { ApprovalHandler } from './utils/approval-handler';

// Initialize audit logger with capability firewall
const auditLogger = new AuditLogger({
  allowedActions: [
    'readRepo',
    'searchCode',
    'listIssues',
    'listPulls',
    'getFile',
    'getCommits'
  ],
  blockedActions: [
    'deleteRepo',
    'deleteFile',
    'pushCode',
    'mergePull',
    'grantAdmin'
  ],
  requireApproval: [
    'createIssue',
    'commentPull',
    'updateFile'
  ],
  allowedEnvironments: ['development', 'test', 'staging']
});

// Initialize approval handler
const approvalHandler = new ApprovalHandler({
  enabled: true,
  interface: 'cli',
  timeout: 300,
  allowedApprovers: [process.env.APPROVER_EMAIL || 'admin@example.com'],
  autoApproveEnvironments: ['development']
});
```

## Usage Examples

### Example 1: Read-Only Operation (No Approval Needed)

```typescript
import { withAudit } from './utils/audit-logger';

// Safe read operation - logged but not blocked
const searchResults = await withAudit(
  auditLogger,
  'github',
  'searchCode',
  { query: 'test', repo: 'my-repo' },
  'user@example.com',
  'development',
  async () => {
    // Execute GitHub code search
    return await githubSearchCode({ query: 'test', repo: 'my-repo' });
  }
);

// Output:
// [MCP AUDIT] ✅ 🟢 github.searchCode | user@example.com | development | SUCCESS
```

### Example 2: Blocked Operation (Capability Firewall)

```typescript
import { withAudit } from './utils/audit-logger';

try {
  await withAudit(
    auditLogger,
    'github',
    'deleteRepo',
    { repo: 'important-repo' },
    'user@example.com',
    'production',
    async () => {
      return await githubDeleteRepo({ repo: 'important-repo' });
    }
  );
} catch (error) {
  console.error(error.message);
  // Output: Action blocked: Action 'deleteRepo' is blocked by capability firewall
}

// Audit log entry:
// {
//   "timestamp": "2025-12-05T10:30:00.000Z",
//   "user": "user@example.com",
//   "environment": "production",
//   "toolName": "github",
//   "action": "deleteRepo",
//   "result": "blocked",
//   "reason": "Action 'deleteRepo' is blocked by capability firewall",
//   "riskLevel": "critical"
// }
```

### Example 3: Approval-Required Operation

```typescript
import { withAudit } from './utils/audit-logger';
import { withApproval } from './utils/approval-handler';

// Create issue - requires approval
try {
  const issue = await withApproval(
    approvalHandler,
    'user@example.com',
    'production',
    'github',
    'createIssue',
    { title: 'Bug Report', body: 'Found a critical bug' },
    'high',
    'Creating production bug report',
    async () => {
      // This will only execute if approved
      return await withAudit(
        auditLogger,
        'github',
        'createIssue',
        { title: 'Bug Report' },
        'user@example.com',
        'production',
        async () => {
          return await githubCreateIssue({
            title: 'Bug Report',
            body: 'Found a critical bug'
          });
        }
      );
    }
  );

  console.log('Issue created:', issue.id);
} catch (error) {
  console.error('Action rejected:', error.message);
}

// CLI Output:
// ================================================================================
// 🚨 APPROVAL REQUIRED - DESTRUCTIVE ACTION DETECTED 🚨
// ================================================================================
// Request ID:   approval-1733394000000-abc123
// User:         user@example.com
// Environment:  production
// Tool:         github
// Action:       createIssue
// Risk Level:   🟠 HIGH
// Reason:       Creating production bug report
// Parameters:   {"title":"Bug Report","body":"Found a critical bug"}
// ================================================================================
//
// Approve this action? (yes/no): yes
// Enter your email for audit trail: admin@example.com
//
// ✅ Action APPROVED
// [MCP AUDIT] ✅ 🟠 github.createIssue | user@example.com | production | SUCCESS
```

### Example 4: Combined Security Flow

```typescript
import { withAudit } from './utils/audit-logger';
import { withApproval } from './utils/approval-handler';

async function performSecuredOperation(
  operation: string,
  params: Record<string, unknown>
) {
  const user = 'developer@example.com';
  const environment = process.env.NODE_ENV || 'development';

  // Step 1: Check if action requires approval
  const validation = auditLogger.validateAction(operation, environment);
  
  if (!validation.allowed) {
    console.error(`❌ Operation blocked: ${validation.reason}`);
    throw new Error(validation.reason);
  }

  // Step 2: If requires approval, request it
  const requiresApproval = auditLogger['capabilities'].requireApproval.includes(operation);
  
  if (requiresApproval && environment !== 'development') {
    const approval = await approvalHandler.requestApproval(
      user,
      environment,
      'github',
      operation,
      params,
      'high',
      `Executing ${operation} in ${environment}`
    );

    if (!approval.approved) {
      throw new Error(`Approval denied: ${approval.reason}`);
    }
  }

  // Step 3: Execute with audit logging
  return await withAudit(
    auditLogger,
    'github',
    operation,
    params,
    user,
    environment,
    async () => {
      // Execute actual operation
      console.log(`Executing ${operation} with params:`, params);
      return { success: true, operation, params };
    }
  );
}

// Usage
await performSecuredOperation('searchCode', { query: 'security' });
await performSecuredOperation('createIssue', { title: 'New Feature' });
```

## Security Reports

### Daily Audit Report

```typescript
// Generate daily audit report
const report = await auditLogger.generateDailyReport();
console.log(report);

// Output:
// === MCP Audit Report ===
// Date: 2025-12-05
//
// Security Metrics:
// - Total Invocations: 156
// - Blocked Actions: 12
// - Failed Actions: 3
// - High Risk Actions: 8
//
// Top Actions:
//   - github.searchCode: 89
//   - github.readRepo: 42
//   - github.listIssues: 15
//   - github.createIssue: 10
//
// ⚠️ Security Anomalies Detected:
//   - High number of blocked actions: 12 in last 24h
//   - Critical risk actions detected: 2 actions
```

### Approval Statistics

```typescript
const approvalStats = await approvalHandler.getApprovalStats(24);
console.log(approvalStats);

// Output:
// {
//   total: 24,
//   approved: 18,
//   rejected: 4,
//   expired: 2,
//   pending: 0,
//   byRiskLevel: { low: 5, medium: 12, high: 6, critical: 1 },
//   byAction: [
//     { action: 'github.createIssue', count: 10 },
//     { action: 'github.commentPull', count: 8 },
//     { action: 'github.updateFile', count: 6 }
//   ]
// }
```

### Anomaly Detection

```typescript
const anomalies = await auditLogger.detectAnomalies(1);
if (anomalies.length > 0) {
  console.warn('🚨 Security Anomalies Detected:');
  anomalies.forEach(anomaly => console.warn(`  - ${anomaly}`));
  
  // Send alerts, trigger incident response, etc.
}

// Output:
// 🚨 Security Anomalies Detected:
//   - High number of blocked actions: 15 in last 1h
//   - Production environment access detected: 3 invocations
```

## Best Practices

### 1. Initialize Security on Startup

```typescript
async function initializeMCPSecurity() {
  // Validate token
  await validateTokenOnStartup({
    enabled: true,
    requiredScopes: ['repo'],
    maxScopes: ['repo', 'read:org'],
    validateOnStartup: true
  });

  // Initialize audit logger
  const auditLogger = new AuditLogger(capabilityRules);
  
  // Initialize approval handler
  const approvalHandler = new ApprovalHandler(approvalConfig);

  // Schedule daily reports
  setInterval(async () => {
    await auditLogger.generateDailyReport();
  }, 24 * 60 * 60 * 1000);

  // Schedule anomaly checks
  setInterval(async () => {
    const anomalies = await auditLogger.detectAnomalies(1);
    if (anomalies.length > 0) {
      // Alert operations team
      console.error('Security anomalies detected!', anomalies);
    }
  }, 60 * 60 * 1000); // Check every hour

  return { auditLogger, approvalHandler };
}
```

### 2. Environment-Specific Configuration

```typescript
const environment = process.env.NODE_ENV || 'development';

const config = {
  development: {
    approvalEnabled: false,
    autoApprove: true,
    allowedEnvironments: ['development']
  },
  test: {
    approvalEnabled: false,
    autoApprove: true,
    allowedEnvironments: ['development', 'test']
  },
  staging: {
    approvalEnabled: true,
    autoApprove: false,
    allowedEnvironments: ['development', 'test', 'staging']
  },
  production: {
    approvalEnabled: true,
    autoApprove: false,
    allowedEnvironments: ['production'],
    strictValidation: true
  }
};

const currentConfig = config[environment];
```

### 3. Error Handling

```typescript
try {
  const result = await performSecuredOperation('deleteFile', { path: 'old.txt' });
} catch (error) {
  if (error.message.includes('blocked by capability firewall')) {
    console.error('🚫 Action not allowed by security policy');
  } else if (error.message.includes('Approval denied')) {
    console.error('❌ Human approval was rejected');
  } else if (error.message.includes('not in allowed list')) {
    console.error('🚫 Environment not authorized for this action');
  } else {
    console.error('❌ Unexpected error:', error.message);
  }
}
```

## Monitoring & Alerting

Set up monitoring dashboards to track:
- Blocked action rate
- Approval rejection rate
- High/critical risk action frequency
- Production environment access
- Token validation failures
- Anomaly detection alerts

Integration with monitoring tools (Datadog, New Relic, etc.):
```typescript
// Send metrics to monitoring service
await sendMetric('mcp.audit.blocked_actions', blockedCount);
await sendMetric('mcp.approval.rejection_rate', rejectionRate);
await sendMetric('mcp.security.anomalies', anomalyCount);
```
