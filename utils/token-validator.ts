import * as https from 'https';

export interface TokenScope {
    scope: string;
    description: string;
    level: 'read' | 'write' | 'admin';
}

export interface TokenValidationResult {
    valid: boolean;
    tokenHash?: string;
    scopes: string[];
    expiresAt?: string;
    hasRequiredScopes: boolean;
    hasExcessiveScopes: boolean;
    excessiveScopes: string[];
    missingScopes: string[];
    rateLimit?: {
        limit: number;
        remaining: number;
        reset: Date;
    };
    errors: string[];
}

export interface TokenValidationConfig {
    enabled: boolean;
    requiredScopes: string[];
    maxScopes: string[];
    validateOnStartup: boolean;
}

/**
 * GitHub Token Scope Validator
 * Verifies that GitHub Personal Access Tokens have only the required permissions
 */
export class TokenValidator {
    private config: TokenValidationConfig;

    constructor(config: TokenValidationConfig) {
        this.config = config;
    }

    /**
     * Validate GitHub token scopes
     */
    async validateGitHubToken(token: string): Promise<TokenValidationResult> {
        const result: TokenValidationResult = {
            valid: false,
            scopes: [],
            hasRequiredScopes: false,
            hasExcessiveScopes: false,
            excessiveScopes: [],
            missingScopes: [],
            errors: [],
        };

        if (!this.config.enabled) {
            result.valid = true;
            result.hasRequiredScopes = true;
            result.errors.push('Token validation disabled');
            return result;
        }

        if (!token || token.trim() === '') {
            result.errors.push('Token is empty or undefined');
            return result;
        }

        try {
            // Call GitHub API to verify token and get scopes
            const apiResult = await this.callGitHubAPI(token);

            if (!apiResult.success) {
                result.errors.push(apiResult.error || 'Failed to validate token');
                return result;
            }

            // Extract scopes from X-OAuth-Scopes header
            result.scopes = apiResult.scopes || [];
            result.tokenHash = this.hashToken(token);
            result.rateLimit = apiResult.rateLimit;

            // Check for required scopes
            result.missingScopes = this.config.requiredScopes.filter(
                required => !this.hasScopeOrParent(result.scopes, required)
            );
            result.hasRequiredScopes = result.missingScopes.length === 0;

            // Check for excessive scopes
            result.excessiveScopes = result.scopes.filter(
                scope => !this.config.maxScopes.includes(scope) && !this.isScopeAllowed(scope)
            );
            result.hasExcessiveScopes = result.excessiveScopes.length > 0;

            // Overall validation
            result.valid = result.hasRequiredScopes && !result.hasExcessiveScopes;

            if (!result.valid) {
                if (result.missingScopes.length > 0) {
                    result.errors.push(`Missing required scopes: ${result.missingScopes.join(', ')}`);
                }
                if (result.excessiveScopes.length > 0) {
                    result.errors.push(`Excessive scopes detected: ${result.excessiveScopes.join(', ')}`);
                }
            }

        } catch (error) {
            result.errors.push(`Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }

    /**
     * Call GitHub API to verify token
     */
    private async callGitHubAPI(token: string): Promise<{
        success: boolean;
        scopes?: string[];
        rateLimit?: { limit: number; remaining: number; reset: Date };
        error?: string;
    }> {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api.github.com',
                path: '/user',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': 'MCP-Token-Validator',
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        // Extract scopes from headers
                        const scopesHeader = res.headers['x-oauth-scopes'] as string || '';
                        const scopes = scopesHeader
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s.length > 0);

                        // Extract rate limit info
                        const rateLimit = {
                            limit: parseInt(res.headers['x-ratelimit-limit'] as string || '0'),
                            remaining: parseInt(res.headers['x-ratelimit-remaining'] as string || '0'),
                            reset: new Date(parseInt(res.headers['x-ratelimit-reset'] as string || '0') * 1000),
                        };

                        resolve({ success: true, scopes, rateLimit });
                    } else if (res.statusCode === 401) {
                        resolve({ success: false, error: 'Invalid or expired token' });
                    } else if (res.statusCode === 403) {
                        resolve({ success: false, error: 'Token lacks required permissions' });
                    } else {
                        resolve({ success: false, error: `GitHub API returned status ${res.statusCode}` });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ success: false, error: `Network error: ${error.message}` });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });

            req.end();
        });
    }

    /**
     * Check if token has a specific scope or a parent scope that includes it
     */
    private hasScopeOrParent(actualScopes: string[], requiredScope: string): boolean {
        // Direct match
        if (actualScopes.includes(requiredScope)) {
            return true;
        }

        // Check for parent scopes
        // For example, 'repo' includes 'repo:status', 'repo:deployment', etc.
        const parentScope = requiredScope.split(':')[0];
        if (actualScopes.includes(parentScope)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a scope is within allowed max scopes
     */
    private isScopeAllowed(scope: string): boolean {
        // Direct match
        if (this.config.maxScopes.includes(scope)) {
            return true;
        }

        // Check if scope is a child of an allowed parent
        for (const allowedScope of this.config.maxScopes) {
            if (scope.startsWith(`${allowedScope}:`)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Create a hash of the token for audit logging (don't log actual tokens)
     */
    private hashToken(token: string): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
    }

    /**
     * Get description of GitHub scopes
     */
    static getScopeDescriptions(): Record<string, string> {
        return {
            'repo': 'Full control of private repositories',
            'repo:status': 'Access commit status',
            'repo:deployment': 'Access deployment status',
            'public_repo': 'Access public repositories',
            'repo:invite': 'Access repository invitations',
            'admin:repo_hook': 'Full control of repository hooks',
            'write:repo_hook': 'Write repository hooks',
            'read:repo_hook': 'Read repository hooks',
            'admin:org': 'Full control of orgs and teams',
            'write:org': 'Read and write org and team membership',
            'read:org': 'Read org and team membership',
            'admin:public_key': 'Full control of user public keys',
            'write:public_key': 'Write user public keys',
            'read:public_key': 'Read user public keys',
            'gist': 'Create gists',
            'notifications': 'Access notifications',
            'user': 'Update all user data',
            'read:user': 'Read all user profile data',
            'user:email': 'Access user email addresses (read-only)',
            'user:follow': 'Follow and unfollow users',
            'delete_repo': 'Delete repositories',
            'write:discussion': 'Read and write team discussions',
            'read:discussion': 'Read team discussions',
            'workflow': 'Update GitHub Action workflows',
        };
    }

    /**
     * Format validation result for display
     */
    static formatValidationResult(result: TokenValidationResult): string {
        let output = '\n' + '='.repeat(80) + '\n';
        output += '🔐 GitHub Token Validation Report\n';
        output += '='.repeat(80) + '\n\n';

        output += `Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}\n`;
        output += `Token Hash: ${result.tokenHash || 'N/A'}\n\n`;

        output += `Detected Scopes (${result.scopes.length}):\n`;
        if (result.scopes.length > 0) {
            const descriptions = TokenValidator.getScopeDescriptions();
            result.scopes.forEach(scope => {
                output += `  • ${scope} - ${descriptions[scope] || 'Unknown scope'}\n`;
            });
        } else {
            output += '  (none)\n';
        }
        output += '\n';

        if (result.missingScopes.length > 0) {
            output += `❌ Missing Required Scopes (${result.missingScopes.length}):\n`;
            result.missingScopes.forEach(scope => {
                output += `  • ${scope}\n`;
            });
            output += '\n';
        }

        if (result.excessiveScopes.length > 0) {
            output += `⚠️  Excessive Scopes Detected (${result.excessiveScopes.length}):\n`;
            result.excessiveScopes.forEach(scope => {
                const descriptions = TokenValidator.getScopeDescriptions();
                output += `  • ${scope} - ${descriptions[scope] || 'Unknown scope'}\n`;
            });
            output += '\n';
            output += '⚠️  WARNING: Token has more permissions than required!\n';
            output += '   This violates the principle of least privilege.\n\n';
        }

        if (result.rateLimit) {
            output += `Rate Limit:\n`;
            output += `  • Limit: ${result.rateLimit.limit} requests/hour\n`;
            output += `  • Remaining: ${result.rateLimit.remaining}\n`;
            output += `  • Resets: ${result.rateLimit.reset.toISOString()}\n\n`;
        }

        if (result.errors.length > 0) {
            output += `Errors:\n`;
            result.errors.forEach(error => {
                output += `  • ${error}\n`;
            });
            output += '\n';
        }

        output += '='.repeat(80) + '\n';

        return output;
    }
}

/**
 * Validate token on startup
 */
export async function validateTokenOnStartup(config: TokenValidationConfig): Promise<void> {
    if (!config.enabled || !config.validateOnStartup) {
        console.log('⏭️  Token validation skipped (disabled in configuration)');
        return;
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('❌ GITHUB_TOKEN environment variable not set!');
        throw new Error('Missing GITHUB_TOKEN environment variable');
    }

    console.log('🔍 Validating GitHub token scopes...');

    const validator = new TokenValidator(config);
    const result = await validator.validateGitHubToken(token);

    console.log(TokenValidator.formatValidationResult(result));

    if (!result.valid) {
        throw new Error('GitHub token validation failed - check scopes and permissions');
    }

    console.log('✅ Token validation passed\n');
}
