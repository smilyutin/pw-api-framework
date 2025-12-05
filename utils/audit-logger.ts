import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface AuditLogEntry {
    timestamp: string;
    sessionId: string;
    user: string;
    environment: string;
    toolName: string;
    action: string;
    parameters: Record<string, unknown>;
    result: 'success' | 'failure' | 'blocked';
    reason?: string;
    duration?: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CapabilityRule {
    allowedActions: string[];
    blockedActions: string[];
    requireApproval: string[];
    allowedEnvironments: string[];
}

export class AuditLogger {
    private logDir: string;
    private sessionId: string;
    private capabilities: CapabilityRule;

    constructor(capabilities: CapabilityRule) {
        this.logDir = path.join(process.cwd(), 'mcp-audit-logs');
        this.sessionId = this.generateSessionId();
        this.capabilities = capabilities;
        this.ensureLogDirectory();
    }

    /**
     * Validate if an action is allowed based on capability rules
     */
    validateAction(action: string, environment: string): { allowed: boolean; reason?: string } {
        // Check if action is explicitly blocked
        if (this.capabilities.blockedActions.includes(action)) {
            return { allowed: false, reason: `Action '${action}' is blocked by capability firewall` };
        }

        // Check if environment is allowed
        if (!this.capabilities.allowedEnvironments.includes(environment)) {
            return { allowed: false, reason: `Environment '${environment}' is not in allowed list` };
        }

        // Check if action requires approval
        if (this.capabilities.requireApproval.includes(action)) {
            return { allowed: false, reason: `Action '${action}' requires human approval (not implemented)` };
        }

        // Check if action is in allowed list (if allowedActions is defined)
        if (this.capabilities.allowedActions.length > 0 && !this.capabilities.allowedActions.includes(action)) {
            return { allowed: false, reason: `Action '${action}' is not in allowed actions list` };
        }

        return { allowed: true };
    }

    /**
     * Log an MCP tool invocation
     */
    async logInvocation(entry: Omit<AuditLogEntry, 'timestamp' | 'sessionId'>): Promise<void> {
        const fullEntry: AuditLogEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
        };

        const logFile = this.getLogFile();
        const logLine = JSON.stringify(fullEntry) + '\n';

        await fs.promises.appendFile(logFile, logLine, 'utf-8');

        // Also write to console for real-time monitoring
        this.logToConsole(fullEntry);
    }

    /**
     * Get security summary for a time period
     */
    async getSecuritySummary(hoursBack: number = 24): Promise<{
        totalInvocations: number;
        blocked: number;
        failures: number;
        highRiskActions: number;
        topActions: Array<{ action: string; count: number }>;
    }> {
        const logs = await this.readRecentLogs(hoursBack);
        
        const summary = {
            totalInvocations: logs.length,
            blocked: logs.filter(l => l.result === 'blocked').length,
            failures: logs.filter(l => l.result === 'failure').length,
            highRiskActions: logs.filter(l => ['high', 'critical'].includes(l.riskLevel)).length,
            topActions: this.getTopActions(logs, 10),
        };

        return summary;
    }

    /**
     * Check for suspicious patterns
     */
    async detectAnomalies(hoursBack: number = 1): Promise<string[]> {
        const logs = await this.readRecentLogs(hoursBack);
        const anomalies: string[] = [];

        // Pattern 1: High rate of blocked actions
        const blockedCount = logs.filter(l => l.result === 'blocked').length;
        if (blockedCount > 10) {
            anomalies.push(`High number of blocked actions: ${blockedCount} in last ${hoursBack}h`);
        }

        // Pattern 2: Multiple failures in short time
        const failureCount = logs.filter(l => l.result === 'failure').length;
        if (failureCount > 5) {
            anomalies.push(`Unusual failure rate: ${failureCount} failures in last ${hoursBack}h`);
        }

        // Pattern 3: Critical risk actions
        const criticalActions = logs.filter(l => l.riskLevel === 'critical');
        if (criticalActions.length > 0) {
            anomalies.push(`Critical risk actions detected: ${criticalActions.length} actions`);
        }

        // Pattern 4: Production environment access
        const prodAccess = logs.filter(l => l.environment === 'production');
        if (prodAccess.length > 0) {
            anomalies.push(`Production environment access detected: ${prodAccess.length} invocations`);
        }

        return anomalies;
    }

    /**
     * Generate daily audit report
     */
    async generateDailyReport(): Promise<string> {
        const summary = await this.getSecuritySummary(24);
        const anomalies = await this.detectAnomalies(24);

        const report = `
=== MCP Audit Report ===
Date: ${new Date().toISOString().split('T')[0]}

Security Metrics:
- Total Invocations: ${summary.totalInvocations}
- Blocked Actions: ${summary.blocked}
- Failed Actions: ${summary.failures}
- High Risk Actions: ${summary.highRiskActions}

Top Actions:
${summary.topActions.map(a => `  - ${a.action}: ${a.count}`).join('\n')}

${anomalies.length > 0 ? `\n⚠️ Security Anomalies Detected:\n${anomalies.map(a => `  - ${a}`).join('\n')}` : '✅ No anomalies detected'}
`;

        // Save report to file
        const reportFile = path.join(this.logDir, `daily-report-${new Date().toISOString().split('T')[0]}.txt`);
        await fs.promises.writeFile(reportFile, report, 'utf-8');

        return report;
    }

    // Private helper methods

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private generateSessionId(): string {
        // Use cryptographically secure random bytes for the sessionId suffix
        const randomSuffix = crypto.randomBytes(16).toString('hex');
        return `session-${Date.now()}-${randomSuffix}`;
    }

    private getLogFile(): string {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `mcp-audit-${today}.jsonl`);
    }

    private logToConsole(entry: AuditLogEntry): void {
        const emoji = entry.result === 'success' ? '✅' : entry.result === 'blocked' ? '🚫' : '❌';
        const riskEmoji = entry.riskLevel === 'critical' ? '🔴' : entry.riskLevel === 'high' ? '🟠' : entry.riskLevel === 'medium' ? '🟡' : '🟢';
        
        console.log(`[MCP AUDIT] ${emoji} ${riskEmoji} ${entry.toolName}.${entry.action} | ${entry.user} | ${entry.environment} | ${entry.result.toUpperCase()}`);
        
        if (entry.reason) {
            console.log(`           Reason: ${entry.reason}`);
        }
    }

    private async readRecentLogs(hoursBack: number): Promise<AuditLogEntry[]> {
        const logs: AuditLogEntry[] = [];
        const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        try {
            const files = await fs.promises.readdir(this.logDir);
            const logFiles = files.filter(f => f.startsWith('mcp-audit-') && f.endsWith('.jsonl'));

            for (const file of logFiles) {
                const content = await fs.promises.readFile(path.join(this.logDir, file), 'utf-8');
                const lines = content.trim().split('\n').filter(l => l.length > 0);

                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line) as AuditLogEntry;
                        if (new Date(entry.timestamp) >= cutoffTime) {
                            logs.push(entry);
                        }
                    } catch {
                        // Skip malformed lines
                    }
                }
            }
        } catch (error) {
            console.error('Error reading audit logs:', error);
        }

        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    private getTopActions(logs: AuditLogEntry[], limit: number): Array<{ action: string; count: number }> {
        const actionCounts = new Map<string, number>();

        for (const log of logs) {
            const key = `${log.toolName}.${log.action}`;
            actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
        }

        return Array.from(actionCounts.entries())
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}

/**
 * Determine risk level based on action type
 */
export function assessRiskLevel(action: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = ['delete', 'drop', 'destroy', 'remove_user', 'grant_admin'];
    const highActions = ['create', 'update', 'push', 'merge', 'deploy'];
    const mediumActions = ['write', 'modify', 'upload', 'publish'];

    const actionLower = action.toLowerCase();

    if (criticalActions.some(a => actionLower.includes(a))) return 'critical';
    if (highActions.some(a => actionLower.includes(a))) return 'high';
    if (mediumActions.some(a => actionLower.includes(a))) return 'medium';
    
    return 'low';
}

/**
 * Example usage wrapper for MCP tools
 */
export async function withAudit<T>(
    logger: AuditLogger,
    toolName: string,
    action: string,
    parameters: Record<string, unknown>,
    user: string,
    environment: string,
    executor: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();
    const riskLevel = assessRiskLevel(action);

    // Validate action before execution
    const validation = logger.validateAction(action, environment);
    
    if (!validation.allowed) {
        await logger.logInvocation({
            user,
            environment,
            toolName,
            action,
            parameters,
            result: 'blocked',
            reason: validation.reason,
            riskLevel,
        });
        throw new Error(`Action blocked: ${validation.reason}`);
    }

    try {
        const result = await executor();
        const duration = Date.now() - startTime;

        await logger.logInvocation({
            user,
            environment,
            toolName,
            action,
            parameters,
            result: 'success',
            duration,
            riskLevel,
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;

        await logger.logInvocation({
            user,
            environment,
            toolName,
            action,
            parameters,
            result: 'failure',
            reason: error instanceof Error ? error.message : 'Unknown error',
            duration,
            riskLevel,
        });

        throw error;
    }
}
