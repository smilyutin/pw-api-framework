import * as crypto from 'crypto';

export interface RedactionRule {
    pattern: RegExp;
    replacement: string;
    description: string;
}

export interface ArtifactSecurityConfig {
    enabled: boolean;
    redactPatterns: string[];
    customRules?: RedactionRule[];
    maxArtifactSize?: number; // bytes
    allowedFileTypes?: string[];
    encryptSensitiveData?: boolean;
    sanitizeMetadata?: boolean;
}

export interface RedactionResult {
    original: string;
    redacted: string;
    redactionCount: number;
    redactedPatterns: string[];
    isSafe: boolean;
    warnings: string[];
}

/**
 * Artifact Security Manager
 * Handles redaction, sanitization, and encryption of MCP artifacts
 */
export class ArtifactSecurityManager {
    private config: ArtifactSecurityConfig;
    private redactionRules: RedactionRule[];

    constructor(config: ArtifactSecurityConfig) {
        this.config = config;
        this.redactionRules = this.buildRedactionRules();
    }

    /**
     * Redact sensitive data from text
     */
    redactText(text: string): RedactionResult {
        if (!this.config.enabled) {
            return {
                original: text,
                redacted: text,
                redactionCount: 0,
                redactedPatterns: [],
                isSafe: true,
                warnings: ['Artifact security disabled'],
            };
        }

        let redacted = text;
        let redactionCount = 0;
        const redactedPatterns: string[] = [];
        const warnings: string[] = [];

        for (const rule of this.redactionRules) {
            const matches = text.match(rule.pattern);
            if (matches) {
                const count = matches.length;
                redacted = redacted.replace(rule.pattern, rule.replacement);
                redactionCount += count;
                redactedPatterns.push(rule.description);
            }
        }

        // Check if any sensitive patterns remain
        const isSafe = !this.detectSensitivePatterns(redacted);
        if (!isSafe) {
            warnings.push('Potential sensitive data still present after redaction');
        }

        return {
            original: text,
            redacted,
            redactionCount,
            redactedPatterns,
            isSafe,
            warnings,
        };
    }

    /**
     * Redact sensitive data from JSON objects
     */
    redactJSON(obj: any): { redacted: any; result: RedactionResult } {
        const jsonString = JSON.stringify(obj, null, 2);
        const result = this.redactText(jsonString);

        try {
            const redacted = JSON.parse(result.redacted);
            return { redacted, result };
        } catch {
            // If parsing fails, return sanitized object
            return { redacted: this.deepRedactObject(obj), result };
        }
    }

    /**
     * Sanitize artifact metadata
     */
    sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
        if (!this.config.sanitizeMetadata) {
            return metadata;
        }

        const sanitized: Record<string, any> = {};

        for (const [key, value] of Object.entries(metadata)) {
            const keyLower = key.toLowerCase();

            // Redact sensitive keys
            if (this.isSensitiveKey(keyLower)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                sanitized[key] = this.redactText(value).redacted;
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeMetadata(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Encrypt sensitive data
     */
    encryptData(data: string, key: string): string {
        if (!this.config.encryptSensitiveData) {
            return data;
        }

        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const derivedKey = crypto.scryptSync(key, 'salt', 32);

        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return JSON.stringify({
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm,
        });
    }

    /**
     * Decrypt sensitive data
     */
    decryptData(encryptedData: string, key: string): string {
        if (!this.config.encryptSensitiveData) {
            return encryptedData;
        }

        try {
            const { encrypted, iv, authTag, algorithm } = JSON.parse(encryptedData);
            const derivedKey = crypto.scryptSync(key, 'salt', 32);

            const decipher = crypto.createDecipheriv(
                algorithm,
                derivedKey,
                Buffer.from(iv, 'hex')
            );
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate artifact file type and size
     */
    validateArtifact(fileName: string, size: number): { valid: boolean; reason?: string } {
        // Check file size
        if (this.config.maxArtifactSize && size > this.config.maxArtifactSize) {
            return {
                valid: false,
                reason: `Artifact size ${size} bytes exceeds maximum ${this.config.maxArtifactSize} bytes`,
            };
        }

        // Check file type
        if (this.config.allowedFileTypes && this.config.allowedFileTypes.length > 0) {
            const extension = fileName.split('.').pop()?.toLowerCase() || '';
            if (!this.config.allowedFileTypes.includes(extension)) {
                return {
                    valid: false,
                    reason: `File type .${extension} is not in allowed types: ${this.config.allowedFileTypes.join(', ')}`,
                };
            }
        }

        return { valid: true };
    }

    /**
     * Generate secure artifact filename
     */
    generateSecureFilename(prefix: string, extension: string): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = crypto.randomBytes(8).toString('hex');
        return `${prefix}-${timestamp}-${random}.${extension}`;
    }

    // Private helper methods

    private buildRedactionRules(): RedactionRule[] {
        const rules: RedactionRule[] = [];

        // Build rules from config patterns
        for (const pattern of this.config.redactPatterns) {
            try {
                rules.push({
                    pattern: new RegExp(pattern, 'gi'),
                    replacement: '[REDACTED]',
                    description: pattern,
                });
            } catch {
                console.warn(`Invalid redaction pattern: ${pattern}`);
            }
        }

        // Add custom rules if provided
        if (this.config.customRules) {
            rules.push(...this.config.customRules);
        }

        // Add default sensitive patterns
        rules.push(
            {
                pattern: /ghp_[a-zA-Z0-9]{36}/gi,
                replacement: '[REDACTED-GITHUB-TOKEN]',
                description: 'GitHub Personal Access Token',
            },
            {
                pattern: /ghs_[a-zA-Z0-9]{36}/gi,
                replacement: '[REDACTED-GITHUB-SECRET]',
                description: 'GitHub Secret',
            },
            {
                pattern: /github_pat_[a-zA-Z0-9_]{82}/gi,
                replacement: '[REDACTED-GITHUB-PAT]',
                description: 'GitHub Fine-grained PAT',
            },
            {
                pattern: /sk-[a-zA-Z0-9]{48}/gi,
                replacement: '[REDACTED-API-KEY]',
                description: 'API Key',
            },
            {
                pattern: /Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/gi,
                replacement: 'Bearer [REDACTED]',
                description: 'Bearer Token',
            },
            {
                pattern: /["']?(password|passwd|pwd)["']?\s*[:=]\s*["']?[^\s"',}]+/gi,
                replacement: '"password": "[REDACTED]"',
                description: 'Password',
            },
            {
                pattern: /["']?(api[_-]?key|apikey)["']?\s*[:=]\s*["']?[^\s"',}]+/gi,
                replacement: '"api_key": "[REDACTED]"',
                description: 'API Key',
            },
            {
                pattern: /["']?(secret|client[_-]?secret)["']?\s*[:=]\s*["']?[^\s"',}]+/gi,
                replacement: '"secret": "[REDACTED]"',
                description: 'Secret',
            },
            {
                pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
                replacement: '[REDACTED-PRIVATE-KEY]',
                description: 'Private Key',
            },
            {
                pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
                replacement: '[REDACTED-SSN]',
                description: 'Social Security Number',
            },
            {
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                replacement: '[REDACTED-EMAIL]',
                description: 'Email Address (optional)',
            },
            {
                pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
                replacement: '[REDACTED-CREDIT-CARD]',
                description: 'Credit Card Number',
            }
        );

        return rules;
    }

    private deepRedactObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                return this.redactText(obj).redacted;
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepRedactObject(item));
        }

        const redacted: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (this.isSensitiveKey(key.toLowerCase())) {
                redacted[key] = '[REDACTED]';
            } else {
                redacted[key] = this.deepRedactObject(value);
            }
        }

        return redacted;
    }

    private isSensitiveKey(key: string): boolean {
        const sensitiveKeys = [
            'password',
            'passwd',
            'pwd',
            'secret',
            'token',
            'api_key',
            'apikey',
            'auth',
            'authorization',
            'private_key',
            'privatekey',
            'credential',
            'access_token',
            'refresh_token',
            'session',
            'cookie',
            'ssn',
            'social_security',
            'credit_card',
            'cvv',
            'pin',
        ];

        return sensitiveKeys.some(sensitive => key.includes(sensitive));
    }

    private detectSensitivePatterns(text: string): boolean {
        // Quick check for common sensitive patterns
        const sensitivePatterns = [
            /ghp_[a-zA-Z0-9]/,
            /ghs_[a-zA-Z0-9]/,
            /Bearer\s+[a-zA-Z0-9]/,
            /-----BEGIN.*PRIVATE.*KEY-----/,
            /password.*[:=]/i,
            /secret.*[:=]/i,
            /token.*[:=]/i,
        ];

        return sensitivePatterns.some(pattern => pattern.test(text));
    }
}

/**
 * Secure screenshot and trace handling for Playwright
 */
export class PlaywrightArtifactSecurity {
    private manager: ArtifactSecurityManager;

    constructor(config: ArtifactSecurityConfig) {
        this.manager = new ArtifactSecurityManager(config);
    }

    /**
     * Sanitize screenshot metadata
     */
    sanitizeScreenshotMetadata(metadata: any): any {
        return this.manager.sanitizeMetadata(metadata);
    }

    /**
     * Sanitize trace data
     */
    sanitizeTraceData(trace: any): any {
        // Redact sensitive data from trace events
        const { redacted } = this.manager.redactJSON(trace);
        return redacted;
    }

    /**
     * Sanitize HAR file
     */
    sanitizeHAR(har: any): any {
        // Deep redaction of HAR file
        const sanitized = { ...har };

        if (sanitized.log?.entries) {
            sanitized.log.entries = sanitized.log.entries.map((entry: any) => ({
                ...entry,
                request: this.sanitizeHARRequest(entry.request),
                response: this.sanitizeHARResponse(entry.response),
            }));
        }

        return sanitized;
    }

    private sanitizeHARRequest(request: any): any {
        const sanitized = { ...request };

        // Redact headers
        if (sanitized.headers) {
            sanitized.headers = sanitized.headers.map((header: any) => {
                if (this.isSensitiveHeader(header.name)) {
                    return { ...header, value: '[REDACTED]' };
                }
                return header;
            });
        }

        // Redact cookies
        if (sanitized.cookies) {
            sanitized.cookies = sanitized.cookies.map((cookie: any) => ({
                ...cookie,
                value: '[REDACTED]',
            }));
        }

        // Redact post data
        if (sanitized.postData) {
            const result = this.manager.redactText(sanitized.postData.text || '');
            sanitized.postData.text = result.redacted;
        }

        return sanitized;
    }

    private sanitizeHARResponse(response: any): any {
        const sanitized = { ...response };

        // Redact headers
        if (sanitized.headers) {
            sanitized.headers = sanitized.headers.map((header: any) => {
                if (this.isSensitiveHeader(header.name)) {
                    return { ...header, value: '[REDACTED]' };
                }
                return header;
            });
        }

        // Redact cookies
        if (sanitized.cookies) {
            sanitized.cookies = sanitized.cookies.map((cookie: any) => ({
                ...cookie,
                value: '[REDACTED]',
            }));
        }

        // Redact content
        if (sanitized.content?.text) {
            const result = this.manager.redactText(sanitized.content.text);
            sanitized.content.text = result.redacted;
        }

        return sanitized;
    }

    private isSensitiveHeader(name: string): boolean {
        const sensitiveHeaders = [
            'authorization',
            'cookie',
            'set-cookie',
            'x-api-key',
            'x-auth-token',
            'authentication',
            'proxy-authorization',
        ];

        return sensitiveHeaders.includes(name.toLowerCase());
    }
}
