import { test } from '@playwright/test';
import { AuditLogger, withAudit, assessRiskLevel } from '../utils/audit-logger';

test.describe('MCP Audit Logger', () => {
    let logger: AuditLogger;

    test.beforeEach(() => {
        logger = new AuditLogger({
            allowedActions: ['readRepo', 'searchCode', 'listIssues', 'getFile'],
            blockedActions: ['deleteRepo', 'deleteFile', 'pushCode', 'mergePull'],
            requireApproval: ['createIssue', 'commentPull'],
            allowedEnvironments: ['development', 'test', 'staging'],
        });
    });

    test('should allow permitted actions in allowed environments', () => {
        const validation = logger.validateAction('readRepo', 'development');
        
        test.expect(validation.allowed).toBe(true);
        test.expect(validation.reason).toBeUndefined();
    });

    test('should block actions explicitly in blockedActions list', () => {
        const validation = logger.validateAction('deleteRepo', 'development');
        
        test.expect(validation.allowed).toBe(false);
        test.expect(validation.reason).toContain('blocked by capability firewall');
    });

    test('should block actions in non-allowed environments', () => {
        const validation = logger.validateAction('readRepo', 'production');
        
        test.expect(validation.allowed).toBe(false);
        test.expect(validation.reason).toContain('not in allowed list');
    });

    test('should block actions requiring approval', () => {
        const validation = logger.validateAction('createIssue', 'development');
        
        test.expect(validation.allowed).toBe(false);
        test.expect(validation.reason).toContain('requires human approval');
    });

    test('should block actions not in allowedActions list', () => {
        const validation = logger.validateAction('unknownAction', 'development');
        
        test.expect(validation.allowed).toBe(false);
        test.expect(validation.reason).toContain('not in allowed actions list');
    });

    test('should log successful invocations', async () => {
        await logger.logInvocation({
            user: 'test@example.com',
            environment: 'test',
            toolName: 'github',
            action: 'searchCode',
            parameters: { query: 'test' },
            result: 'success',
            duration: 150,
            riskLevel: 'low',
        });

        // Log file should be created - verify it exists
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(process.cwd(), 'mcp-audit-logs', `mcp-audit-${new Date().toISOString().split('T')[0]}.jsonl`);
        
        test.expect(fs.existsSync(logFile)).toBe(true);
    });

    test('should assess risk levels correctly', () => {
        test.expect(assessRiskLevel('deleteRepo')).toBe('critical');
        test.expect(assessRiskLevel('createIssue')).toBe('high');
        test.expect(assessRiskLevel('updateFile')).toBe('medium');
        test.expect(assessRiskLevel('searchCode')).toBe('low');
    });

    test('should block execution with withAudit wrapper for blocked actions', async () => {
        await test.expect(
            withAudit(
                logger,
                'github',
                'deleteRepo',
                { repo: 'test-repo' },
                'test@example.com',
                'development',
                async () => {
                    return { success: true };
                }
            )
        ).rejects.toThrow('Action blocked');
    });

    test('should execute and log successful actions with withAudit wrapper', async () => {
        const result = await withAudit(
            logger,
            'github',
            'searchCode',
            { query: 'test' },
            'test@example.com',
            'development',
            async () => {
                return { results: ['result1', 'result2'] };
            }
        );

        test.expect(result.results).toHaveLength(2);
    });

    test('should get security summary for recent logs', async () => {
        // Create some test logs
        await logger.logInvocation({
            user: 'test@example.com',
            environment: 'test',
            toolName: 'github',
            action: 'searchCode',
            parameters: { query: 'test' },
            result: 'success',
            riskLevel: 'low',
        });

        await logger.logInvocation({
            user: 'test@example.com',
            environment: 'development',
            toolName: 'github',
            action: 'deleteRepo',
            parameters: { repo: 'test' },
            result: 'blocked',
            reason: 'Blocked by capability firewall',
            riskLevel: 'critical',
        });

        const summary = await logger.getSecuritySummary(1);

        test.expect(summary.totalInvocations).toBeGreaterThanOrEqual(2);
        test.expect(summary.blocked).toBeGreaterThanOrEqual(1);
        test.expect(summary.highRiskActions).toBeGreaterThanOrEqual(1);
    });

    test('should detect anomalies in logs', async () => {
        // Create multiple blocked actions to trigger anomaly detection
        for (let i = 0; i < 12; i++) {
            await logger.logInvocation({
                user: 'test@example.com',
                environment: 'development',
                toolName: 'github',
                action: 'deleteRepo',
                parameters: { repo: `test-${i}` },
                result: 'blocked',
                reason: 'Blocked by capability firewall',
                riskLevel: 'critical',
            });
        }

        const anomalies = await logger.detectAnomalies(1);

        test.expect(anomalies.length).toBeGreaterThan(0);
        test.expect(anomalies.some(a => a.includes('blocked actions'))).toBe(true);
        test.expect(anomalies.some(a => a.includes('Critical risk actions'))).toBe(true);
    });
});
