// APILogger: Captures and redacts sensitive information from HTTP requests and responses.
// Implements OWASP security practices by masking tokens, passwords, API keys, and other secrets
// in headers and request/response bodies. Provides recent logs for enriched error messages.

export class APILogger {

    // In-memory buffer of recent request/response log entries
    private recentLogs: any[] = [];

    // Redact sensitive HTTP headers (Authorization, cookies, API keys) to prevent secret leakage
    private sanitizeHeaders(headers: Record<string, string> | undefined) {
        if (!headers) return {} as Record<string, string>;
        const redacted: Record<string, string> = {};
        for (const [k, v] of Object.entries(headers)) {
            const key = k.toLowerCase();
            // Check if header contains sensitive data
            if (['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-access-token', 'x-github-token'].includes(key)) {
                // Mask the value while preserving prefix and last few characters
                redacted[k] = this.maskValue(v);
            } else {
                redacted[k] = v;
            }
        }
        return redacted;
    }

    // Recursively sanitize request/response body, masking fields like password, token, secret
    private sanitizeBody(body: unknown): unknown {
        if (body === null || body === undefined) return body;
        // Check strings for JWT tokens and mask if found
        if (typeof body === 'string') return this.maybeMaskTokenString(body);
        // Recursively sanitize array elements
        if (Array.isArray(body)) return body.map((i) => this.sanitizeBody(i));
        if (typeof body === 'object') {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
                // Redact fields matching common secret patterns
                if (/^(password|token|secret|apiKey|authorization)$/i.test(k)) {
                    out[k] = '***redacted***';
                } else {
                    // Recursively sanitize nested objects
                    out[k] = this.sanitizeBody(v);
                }
            }
            return out;
        }
        return body;
    }

    // Mask a secret value by showing only prefix and a few characters at start/end
    // E.g., 'Bearer abc123xyz789' becomes 'Bearer abc123…8789'
    private maskValue(value: string) {
        if (!value) return value;
        // Detect common authorization prefixes
        const prefixes = ['Bearer ', 'Token ', 'token ', 'bearer '];
        const prefix = prefixes.find(p => value.startsWith(p));
        // Strip prefix to mask the actual token
        const raw = prefix ? value.slice(prefix.length) : value;
        // Mask short values completely, show first 6 and last 4 chars for longer ones
        const masked = raw.length <= 10 ? '***redacted***' : `${raw.slice(0, 6)}…${raw.slice(-4)}`;
        // Restore prefix if present
        return prefix ? `${prefix}${masked}` : masked;
    }

    // Detect JWT tokens in strings and mask them to prevent leakage
    private maybeMaskTokenString(value: string) {
        // Regex for JWT pattern: eyJ... (base64 header, payload, signature)
        if (/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(value)) {
            return this.maskValue(value);
        }
        return value;
    }

    // Log an outgoing HTTP request with redacted headers and body
    // Safe for CI/CD logs, reports, and error messages (no secret exposure)
    logRequest(method: string, url: string, headers: Record<string, string>, body?: any) {
        const safe = {
            type: 'request',
            method,
            url,
            headers: this.sanitizeHeaders(headers),
            body: this.sanitizeBody(body)
        };
        // Store in buffer for later retrieval (e.g., on test failure)
        this.recentLogs.push({ type: 'Request Details', data: safe });
        // Print to console for immediate visibility
        //console.log('API Request:', safe);
    }

    // Log an HTTP response with redacted headers and body
    logResponse(statusCode: number, headers: Record<string, string>, body?: unknown) {
        const safe = {
            statusCode,
            headers: this.sanitizeHeaders(headers),
            body: this.sanitizeBody(body)
        };
        // Add to recent logs buffer
        this.recentLogs.push({ type: 'Response Details', data: safe });
        // Print to console
        //console.log('API Response:', safe);
    }

    // Retrieve formatted recent logs for inclusion in error messages or reports
    getRecentLogs() {
        const logs = this.recentLogs.map(log => {
            // Format each log entry with header and indented JSON
            return `===${log.type}===\n${JSON.stringify(log.data, null, 4)}`;
        }).join(`\n\n`)
        return logs;
    }
}
