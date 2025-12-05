import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export interface ApprovalRequest {
    id: string;
    timestamp: string;
    user: string;
    environment: string;
    toolName: string;
    action: string;
    parameters: Record<string, unknown>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    approver?: string;
    approvalTimestamp?: string;
    expiresAt: string;
}

export interface ApprovalHandlerConfig {
    enabled: boolean;
    interface: 'cli' | 'web' | 'api';
    timeout: number; // seconds
    allowedApprovers: string[];
    autoApproveEnvironments?: string[];
    requireReason?: boolean;
}

export class ApprovalHandler {
    private config: ApprovalHandlerConfig;
    private pendingRequests: Map<string, ApprovalRequest>;
    private approvalLog: string;

    constructor(config: ApprovalHandlerConfig) {
        this.config = config;
        this.pendingRequests = new Map();
        this.approvalLog = path.join(process.cwd(), 'mcp-audit-logs', 'approvals.jsonl');
        this.ensureLogDirectory();
    }

    /**
     * Request approval for a destructive action
     */
    async requestApproval(
        user: string,
        environment: string,
        toolName: string,
        action: string,
        parameters: Record<string, unknown>,
        riskLevel: 'low' | 'medium' | 'high' | 'critical',
        reason: string
    ): Promise<{ approved: boolean; reason?: string; approver?: string }> {
        // Check if approval is enabled
        if (!this.config.enabled) {
            return { approved: true, reason: 'Approval handler disabled' };
        }

        // Auto-approve for certain environments if configured
        if (this.config.autoApproveEnvironments?.includes(environment)) {
            await this.logApproval({
                id: this.generateRequestId(),
                timestamp: new Date().toISOString(),
                user,
                environment,
                toolName,
                action,
                parameters,
                riskLevel,
                reason,
                status: 'approved',
                approver: 'auto-approved',
                approvalTimestamp: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.config.timeout * 1000).toISOString(),
            });
            return { approved: true, reason: 'Auto-approved for environment', approver: 'auto-approved' };
        }

        // Create approval request
        const request: ApprovalRequest = {
            id: this.generateRequestId(),
            timestamp: new Date().toISOString(),
            user,
            environment,
            toolName,
            action,
            parameters,
            riskLevel,
            reason,
            status: 'pending',
            expiresAt: new Date(Date.now() + this.config.timeout * 1000).toISOString(),
        };

        this.pendingRequests.set(request.id, request);

        // Request approval based on interface type
        let result: { approved: boolean; reason?: string; approver?: string };

        switch (this.config.interface) {
            case 'cli':
                result = await this.requestApprovalCLI(request);
                break;
            case 'web':
                result = await this.requestApprovalWeb(request);
                break;
            case 'api':
                result = await this.requestApprovalAPI(request);
                break;
            default:
                result = { approved: false, reason: 'Invalid approval interface configured' };
        }

        // Update request status
        request.status = result.approved ? 'approved' : 'rejected';
        request.approver = result.approver;
        request.approvalTimestamp = new Date().toISOString();

        // Log the approval decision
        await this.logApproval(request);

        // Remove from pending
        this.pendingRequests.delete(request.id);

        return result;
    }

    /**
     * CLI-based approval interface
     */
    private async requestApprovalCLI(request: ApprovalRequest): Promise<{ approved: boolean; reason?: string; approver?: string }> {
        console.log('\n' + '='.repeat(80));
        console.log('🚨 APPROVAL REQUIRED - DESTRUCTIVE ACTION DETECTED 🚨');
        console.log('='.repeat(80));
        console.log(`Request ID:   ${request.id}`);
        console.log(`User:         ${request.user}`);
        console.log(`Environment:  ${request.environment}`);
        console.log(`Tool:         ${request.toolName}`);
        console.log(`Action:       ${request.action}`);
        console.log(`Risk Level:   ${this.getRiskEmoji(request.riskLevel)} ${request.riskLevel.toUpperCase()}`);
        console.log(`Reason:       ${request.reason}`);
        console.log(`Parameters:   ${JSON.stringify(request.parameters, null, 2)}`);
        console.log(`Expires:      ${request.expiresAt}`);
        console.log('='.repeat(80));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                rl.close();
                console.log('\n⏱️  Approval request timed out - REJECTED\n');
                resolve({ approved: false, reason: 'Approval request timed out' });
            }, this.config.timeout * 1000);

            rl.question('\nApprove this action? (yes/no): ', (answer) => {
                clearTimeout(timeout);

                if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                    rl.question('Enter your email for audit trail: ', (approverEmail) => {
                        rl.close();

                        if (this.config.allowedApprovers.length > 0 && !this.config.allowedApprovers.includes(approverEmail)) {
                            console.log(`\n❌ User ${approverEmail} is not an allowed approver - REJECTED\n`);
                            resolve({ approved: false, reason: 'User not in allowed approvers list' });
                        } else {
                            console.log('\n✅ Action APPROVED\n');
                            resolve({ approved: true, approver: approverEmail });
                        }
                    });
                } else {
                    rl.close();
                    console.log('\n❌ Action REJECTED by user\n');
                    resolve({ approved: false, reason: 'Rejected by user' });
                }
            });
        });
    }

    /**
     * Web-based approval interface (placeholder for future implementation)
     */
    private async requestApprovalWeb(request: ApprovalRequest): Promise<{ approved: boolean; reason?: string; approver?: string }> {
        // TODO: Implement web-based approval UI
        // This would typically:
        // 1. Create a pending approval record in a database
        // 2. Send notification to approvers via email/Slack/Teams
        // 3. Provide a web UI for approvers to review and approve/reject
        // 4. Poll for approval decision or use webhooks

        console.log('⚠️  Web-based approval not yet implemented, falling back to CLI');
        return this.requestApprovalCLI(request);
    }

    /**
     * API-based approval interface (placeholder for future implementation)
     */
    private async requestApprovalAPI(request: ApprovalRequest): Promise<{ approved: boolean; reason?: string; approver?: string }> {
        // TODO: Implement API-based approval
        // This would typically:
        // 1. POST approval request to external approval service
        // 2. Wait for callback or poll for decision
        // 3. Return approval result

        console.log('⚠️  API-based approval not yet implemented, falling back to CLI');
        return this.requestApprovalCLI(request);
    }

    /**
     * Get all pending approval requests
     */
    getPendingRequests(): ApprovalRequest[] {
        const now = new Date();
        const pending: ApprovalRequest[] = [];

        for (const [id, request] of this.pendingRequests.entries()) {
            if (new Date(request.expiresAt) < now) {
                // Mark as expired
                request.status = 'expired';
                this.logApproval(request);
                this.pendingRequests.delete(id);
            } else {
                pending.push(request);
            }
        }

        return pending;
    }

    /**
     * Manually approve a pending request (for API/web interface)
     */
    async approve(requestId: string, approver: string): Promise<boolean> {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            return false;
        }

        if (new Date(request.expiresAt) < new Date()) {
            request.status = 'expired';
            await this.logApproval(request);
            this.pendingRequests.delete(requestId);
            return false;
        }

        request.status = 'approved';
        request.approver = approver;
        request.approvalTimestamp = new Date().toISOString();

        await this.logApproval(request);
        this.pendingRequests.delete(requestId);

        return true;
    }

    /**
     * Manually reject a pending request (for API/web interface)
     */
    async reject(requestId: string, approver: string, reason?: string): Promise<boolean> {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            return false;
        }

        request.status = 'rejected';
        request.approver = approver;
        request.approvalTimestamp = new Date().toISOString();
        if (reason) {
            request.reason = reason;
        }

        await this.logApproval(request);
        this.pendingRequests.delete(requestId);

        return true;
    }

    /**
     * Get approval statistics
     */
    async getApprovalStats(hoursBack: number = 24): Promise<{
        total: number;
        approved: number;
        rejected: number;
        expired: number;
        pending: number;
        byRiskLevel: Record<string, number>;
        byAction: Array<{ action: string; count: number }>;
    }> {
        const logs = await this.readRecentApprovals(hoursBack);

        const stats = {
            total: logs.length,
            approved: logs.filter(l => l.status === 'approved').length,
            rejected: logs.filter(l => l.status === 'rejected').length,
            expired: logs.filter(l => l.status === 'expired').length,
            pending: this.pendingRequests.size,
            byRiskLevel: {
                low: logs.filter(l => l.riskLevel === 'low').length,
                medium: logs.filter(l => l.riskLevel === 'medium').length,
                high: logs.filter(l => l.riskLevel === 'high').length,
                critical: logs.filter(l => l.riskLevel === 'critical').length,
            },
            byAction: this.getTopActions(logs, 10),
        };

        return stats;
    }

    // Private helper methods

    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.approvalLog);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    private generateRequestId(): string {
        return `approval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }

    private getRiskEmoji(riskLevel: string): string {
        const emojis: Record<string, string> = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴',
        };
        return emojis[riskLevel] || '⚪';
    }

    private async logApproval(request: ApprovalRequest): Promise<void> {
        const logLine = JSON.stringify(request) + '\n';
        await fs.promises.appendFile(this.approvalLog, logLine, 'utf-8');
    }

    private async readRecentApprovals(hoursBack: number): Promise<ApprovalRequest[]> {
        const approvals: ApprovalRequest[] = [];
        const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        try {
            if (!fs.existsSync(this.approvalLog)) {
                return approvals;
            }

            const content = await fs.promises.readFile(this.approvalLog, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l.length > 0);

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line) as ApprovalRequest;
                    if (new Date(entry.timestamp) >= cutoffTime) {
                        approvals.push(entry);
                    }
                } catch {
                    // Skip malformed lines
                }
            }
        } catch (error) {
            console.error('Error reading approval logs:', error);
        }

        return approvals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    private getTopActions(approvals: ApprovalRequest[], limit: number): Array<{ action: string; count: number }> {
        const actionCounts = new Map<string, number>();

        for (const approval of approvals) {
            const key = `${approval.toolName}.${approval.action}`;
            actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
        }

        return Array.from(actionCounts.entries())
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}

/**
 * Wrapper function to execute action with approval requirement
 */
export async function withApproval<T>(
    handler: ApprovalHandler,
    user: string,
    environment: string,
    toolName: string,
    action: string,
    parameters: Record<string, unknown>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    reason: string,
    executor: () => Promise<T>
): Promise<T> {
    const approval = await handler.requestApproval(
        user,
        environment,
        toolName,
        action,
        parameters,
        riskLevel,
        reason
    );

    if (!approval.approved) {
        throw new Error(`Action rejected: ${approval.reason || 'No approval received'}`);
    }

    console.log(`✅ Executing approved action by ${approval.approver}`);
    return await executor();
}
