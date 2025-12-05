import { test } from '@playwright/test';
import { ArtifactSecurityManager, PlaywrightArtifactSecurity } from '../utils/artifact-security';

test.describe('Artifact Security Manager', () => {
    let manager: ArtifactSecurityManager;

    test.beforeEach(() => {
        manager = new ArtifactSecurityManager({
            enabled: true,
            redactPatterns: ['ghp_.*', '.*token.*', '.*secret.*', '.*password.*'],
            sanitizeMetadata: true,
            maxArtifactSize: 1024 * 1024, // 1MB
            allowedFileTypes: ['json', 'txt', 'log'],
        });
    });

    test('should redact GitHub tokens', () => {
        const text = 'My token is ghp_1234567890abcdefghijklmnopqrstuvwxyz';
        const result = manager.redactText(text);

        test.expect(result.redacted).not.toContain('ghp_');
        test.expect(result.redacted).toContain('[REDACTED-GITHUB-TOKEN]');
        test.expect(result.redactionCount).toBeGreaterThan(0);
        test.expect(result.isSafe).toBe(true);
    });

    test('should redact Bearer tokens', () => {
        const text = 'Authorization: Bearer abc123def456ghi789';
        const result = manager.redactText(text);

        test.expect(result.redacted).toContain('Bearer [REDACTED]');
        test.expect(result.redactionCount).toBeGreaterThan(0);
    });

    test('should redact passwords in JSON', () => {
        const text = '{"password": "secretPassword123", "username": "user"}';
        const result = manager.redactText(text);

        test.expect(result.redacted).not.toContain('secretPassword123');
        test.expect(result.redacted).toContain('[REDACTED]');
    });

    test('should redact private keys', () => {
        const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQ...\n-----END RSA PRIVATE KEY-----';
        const result = manager.redactText(text);

        test.expect(result.redacted).toContain('[REDACTED-PRIVATE-KEY]');
        test.expect(result.redactionCount).toBeGreaterThan(0);
    });

    test('should redact SSN', () => {
        const text = 'SSN: 123-45-6789';
        const result = manager.redactText(text);

        test.expect(result.redacted).not.toContain('123-45-6789');
        test.expect(result.redacted).toContain('[REDACTED-SSN]');
    });

    test('should redact credit card numbers', () => {
        const text = 'Card: 4532-1234-5678-9010';
        const result = manager.redactText(text);

        test.expect(result.redacted).toContain('[REDACTED-CREDIT-CARD]');
    });

    test('should redact JSON objects', () => {
        const obj = {
            username: 'testuser',
            password: 'secret123',
            api_key: 'abc-def-ghi',
            data: {
                token: 'xyz789'
            }
        };

        const { redacted, result } = manager.redactJSON(obj);

        test.expect(redacted.password).toBe('[REDACTED]');
        test.expect(redacted.api_key).toBe('[REDACTED]');
        test.expect(result.redactionCount).toBeGreaterThan(0);
    });

    test('should sanitize metadata', () => {
        const metadata = {
            name: 'test',
            password: 'secret',
            apiKey: 'key123',
            description: 'Safe data'
        };

        const sanitized = manager.sanitizeMetadata(metadata);

        test.expect(sanitized.password).toBe('[REDACTED]');
        test.expect(sanitized.apiKey).toBe('[REDACTED]');
        test.expect(sanitized.description).toBe('Safe data');
    });

    test('should validate artifact size', () => {
        const validSize = manager.validateArtifact('test.json', 500000);
        test.expect(validSize.valid).toBe(true);

        const invalidSize = manager.validateArtifact('large.json', 2000000);
        test.expect(invalidSize.valid).toBe(false);
        test.expect(invalidSize.reason).toContain('exceeds maximum');
    });

    test('should validate file types', () => {
        const validType = manager.validateArtifact('test.json', 1000);
        test.expect(validType.valid).toBe(true);

        const invalidType = manager.validateArtifact('test.exe', 1000);
        test.expect(invalidType.valid).toBe(false);
        test.expect(invalidType.reason).toContain('not in allowed types');
    });

    test('should generate secure filenames', () => {
        const filename1 = manager.generateSecureFilename('test', 'json');
        const filename2 = manager.generateSecureFilename('test', 'json');

        test.expect(filename1).toMatch(/^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-.*\.json$/);
        test.expect(filename1).not.toBe(filename2); // Should be unique
    });

    test('should skip redaction when disabled', () => {
        const disabledManager = new ArtifactSecurityManager({
            enabled: false,
            redactPatterns: [],
        });

        const text = 'ghp_1234567890 password=secret';
        const result = disabledManager.redactText(text);

        test.expect(result.redacted).toBe(text);
        test.expect(result.redactionCount).toBe(0);
        test.expect(result.warnings).toContain('Artifact security disabled');
    });

    test('should encrypt and decrypt data', () => {
        const encryptManager = new ArtifactSecurityManager({
            enabled: true,
            redactPatterns: [],
            encryptSensitiveData: true,
        });

        const originalData = 'Sensitive information';
        const key = 'encryption-key-123';

        const encrypted = encryptManager.encryptData(originalData, key);
        test.expect(encrypted).not.toBe(originalData);
        test.expect(encrypted).toContain('"encrypted"');

        const decrypted = encryptManager.decryptData(encrypted, key);
        test.expect(decrypted).toBe(originalData);
    });
});

test.describe('Playwright Artifact Security', () => {
    let security: PlaywrightArtifactSecurity;

    test.beforeEach(() => {
        security = new PlaywrightArtifactSecurity({
            enabled: true,
            redactPatterns: ['ghp_.*', '.*token.*', '.*secret.*'],
            sanitizeMetadata: true,
        });
    });

    test('should sanitize HAR request headers', () => {
        const har = {
            log: {
                entries: [{
                    request: {
                        method: 'GET',
                        url: 'https://api.github.com/user',
                        headers: [
                            { name: 'Authorization', value: 'Bearer ghp_token123' },
                            { name: 'User-Agent', value: 'Test' }
                        ],
                        cookies: [
                            { name: 'session', value: 'secret123' }
                        ]
                    },
                    response: {
                        status: 200,
                        headers: [
                            { name: 'Set-Cookie', value: 'session=abc123' }
                        ],
                        content: {
                            text: '{"token": "ghp_xyz"}'
                        }
                    }
                }]
            }
        };

        const sanitized = security.sanitizeHAR(har);

        const authHeader = sanitized.log.entries[0].request.headers.find(
            (h: any) => h.name === 'Authorization'
        );
        test.expect(authHeader.value).toBe('[REDACTED]');

        const cookie = sanitized.log.entries[0].request.cookies[0];
        test.expect(cookie.value).toBe('[REDACTED]');

        const responseHeader = sanitized.log.entries[0].response.headers.find(
            (h: any) => h.name === 'Set-Cookie'
        );
        test.expect(responseHeader.value).toBe('[REDACTED]');

        test.expect(sanitized.log.entries[0].response.content.text).not.toContain('ghp_xyz');
    });

    test('should preserve non-sensitive HAR data', () => {
        const har = {
            log: {
                entries: [{
                    request: {
                        method: 'GET',
                        url: 'https://api.github.com/repos',
                        headers: [
                            { name: 'Content-Type', value: 'application/json' }
                        ]
                    },
                    response: {
                        status: 200,
                        headers: [
                            { name: 'Content-Type', value: 'application/json' }
                        ]
                    }
                }]
            }
        };

        const sanitized = security.sanitizeHAR(har);

        test.expect(sanitized.log.entries[0].request.method).toBe('GET');
        test.expect(sanitized.log.entries[0].request.url).toBe('https://api.github.com/repos');
        
        const contentType = sanitized.log.entries[0].request.headers.find(
            (h: any) => h.name === 'Content-Type'
        );
        test.expect(contentType.value).toBe('application/json');
    });
});
