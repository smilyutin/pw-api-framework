import { test } from '@playwright/test';
import { TokenValidator } from '../utils/token-validator';

test.describe('Token Validator', () => {
    test('should validate token configuration is enabled', () => {
        const validator = new TokenValidator({
            enabled: true,
            requiredScopes: ['repo'],
            maxScopes: ['repo', 'read:org'],
            validateOnStartup: true,
        });

        test.expect(validator).toBeDefined();
    });

    test('should return valid when validation is disabled', async () => {
        const validator = new TokenValidator({
            enabled: false,
            requiredScopes: ['repo'],
            maxScopes: ['repo'],
            validateOnStartup: false,
        });

        const result = await validator.validateGitHubToken('fake-token');

        test.expect(result.valid).toBe(true);
        test.expect(result.hasRequiredScopes).toBe(true);
        test.expect(result.errors).toContain('Token validation disabled');
    });

    test('should detect empty token', async () => {
        const validator = new TokenValidator({
            enabled: true,
            requiredScopes: ['repo'],
            maxScopes: ['repo'],
            validateOnStartup: false,
        });

        const result = await validator.validateGitHubToken('');

        test.expect(result.valid).toBe(false);
        test.expect(result.errors).toContain('Token is empty or undefined');
    });

    test('should get scope descriptions', () => {
        const descriptions = TokenValidator.getScopeDescriptions();

        test.expect(descriptions['repo']).toBe('Full control of private repositories');
        test.expect(descriptions['read:org']).toBe('Read org and team membership');
        test.expect(descriptions['delete_repo']).toBe('Delete repositories');
    });

    test('should format validation result correctly', () => {
        const mockResult = {
            valid: true,
            tokenHash: 'abc123def456',
            scopes: ['repo', 'read:org'],
            hasRequiredScopes: true,
            hasExcessiveScopes: false,
            excessiveScopes: [],
            missingScopes: [],
            errors: [],
            rateLimit: {
                limit: 5000,
                remaining: 4987,
                reset: new Date('2025-12-05T12:00:00Z'),
            },
        };

        const formatted = TokenValidator.formatValidationResult(mockResult);

        test.expect(formatted).toContain(' VALID');
        test.expect(formatted).toContain('abc123def456');
        test.expect(formatted).toContain('repo');
        test.expect(formatted).toContain('read:org');
        test.expect(formatted).toContain('5000');
    });

    test('should format validation result with errors', () => {
        const mockResult = {
            valid: false,
            tokenHash: 'xyz789',
            scopes: ['repo', 'admin:org', 'delete_repo'],
            hasRequiredScopes: true,
            hasExcessiveScopes: true,
            excessiveScopes: ['admin:org', 'delete_repo'],
            missingScopes: [],
            errors: ['Excessive scopes detected: admin:org, delete_repo'],
        };

        const formatted = TokenValidator.formatValidationResult(mockResult);

        test.expect(formatted).toContain(' INVALID');
        test.expect(formatted).toContain('Excessive Scopes Detected');
        test.expect(formatted).toContain('admin:org');
        test.expect(formatted).toContain('delete_repo');
        test.expect(formatted).toContain('more permissions than required');
    });

    test('should format validation result with missing scopes', () => {
        const mockResult = {
            valid: false,
            tokenHash: 'missing123',
            scopes: ['read:user'],
            hasRequiredScopes: false,
            hasExcessiveScopes: false,
            excessiveScopes: [],
            missingScopes: ['repo', 'read:org'],
            errors: ['Missing required scopes: repo, read:org'],
        };

        const formatted = TokenValidator.formatValidationResult(mockResult);

        test.expect(formatted).toContain(' INVALID');
        test.expect(formatted).toContain('Missing Required Scopes');
        test.expect(formatted).toContain('repo');
        test.expect(formatted).toContain('read:org');
    });

    test.skip('should validate real GitHub token (requires GITHUB_TOKEN env var)', async () => {
        // This test is skipped by default as it requires a real GitHub token
        // To run: GITHUB_TOKEN=your_token npm test -- --grep "validate real GitHub token"
        
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            test.skip();
            return;
        }

        const validator = new TokenValidator({
            enabled: true,
            requiredScopes: ['repo'],
            maxScopes: ['repo', 'read:org', 'write:discussion'],
            validateOnStartup: true,
        });

        const result = await validator.validateGitHubToken(token);

        console.log(TokenValidator.formatValidationResult(result));

        test.expect(result.scopes.length).toBeGreaterThan(0);
        test.expect(result.tokenHash).toBeDefined();
        test.expect(result.rateLimit).toBeDefined();
    });
});
