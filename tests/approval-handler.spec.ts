import { test } from '@playwright/test';
import { ApprovalHandler, withApproval } from '../utils/approval-handler';

test.describe('Approval Handler', () => {
    let handler: ApprovalHandler;

    test.beforeEach(() => {
        handler = new ApprovalHandler({
            enabled: true,
            interface: 'cli',
            timeout: 5,
            allowedApprovers: ['admin@example.com', 'approver@example.com'],
            autoApproveEnvironments: ['development'],
        });
    });

    test('should auto-approve for configured environments', async () => {
        const result = await handler.requestApproval(
            'user@example.com',
            'development',
            'github',
            'deleteFile',
            { path: 'test.txt' },
            'high',
            'Testing auto-approval'
        );

        test.expect(result.approved).toBe(true);
        test.expect(result.approver).toBe('auto-approved');
        test.expect(result.reason).toContain('Auto-approved');
    });

    test('should skip approval when disabled', async () => {
        const disabledHandler = new ApprovalHandler({
            enabled: false,
            interface: 'cli',
            timeout: 5,
            allowedApprovers: [],
        });

        const result = await disabledHandler.requestApproval(
            'user@example.com',
            'production',
            'github',
            'deleteRepo',
            { repo: 'test-repo' },
            'critical',
            'Testing disabled handler'
        );

        test.expect(result.approved).toBe(true);
        test.expect(result.reason).toContain('disabled');
    });

    test('should track pending approval requests', async () => {
        test.expect(handler.getPendingRequests()).toHaveLength(0);
    });

    test('should get approval statistics', async () => {
        // Create some test approvals
        await handler.requestApproval(
            'user@example.com',
            'development',
            'github',
            'createIssue',
            { title: 'Test' },
            'medium',
            'Auto-approved test'
        );

        const stats = await handler.getApprovalStats(1);

        test.expect(stats.total).toBeGreaterThanOrEqual(1);
        test.expect(stats.approved).toBeGreaterThanOrEqual(1);
        test.expect(stats.byRiskLevel).toBeDefined();
        test.expect(stats.byAction).toBeDefined();
    });

    test('should throw error when approval rejected with withApproval wrapper', async () => {
        const autoRejectHandler = new ApprovalHandler({
            enabled: true,
            interface: 'cli',
            timeout: 0.1, // Very short timeout to force rejection
            allowedApprovers: [],
        });

        await test.expect(
            withApproval(
                autoRejectHandler,
                'user@example.com',
                'production',
                'github',
                'deleteRepo',
                { repo: 'important-repo' },
                'critical',
                'Attempting to delete production repo',
                async () => {
                    return { success: true };
                }
            )
        ).rejects.toThrow('Action rejected');
    });

    test('should execute action when approved with withApproval wrapper', async () => {
        const result = await withApproval(
            handler,
            'user@example.com',
            'development',
            'github',
            'createIssue',
            { title: 'Test Issue' },
            'medium',
            'Creating test issue in dev environment',
            async () => {
                return { success: true, issueId: 123 };
            }
        );

        test.expect(result.success).toBe(true);
        test.expect(result.issueId).toBe(123);
    });
});
