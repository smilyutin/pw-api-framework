

export class APILogger {

    private recentLogs: any[] = [];

    private sanitizeHeaders(headers: Record<string, string> | undefined) {
        if (!headers) return {} as Record<string, string>;
        const redacted: Record<string, string> = {};
        for (const [k, v] of Object.entries(headers)) {
            const key = k.toLowerCase();
            if (['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-access-token', 'x-github-token'].includes(key)) {
                redacted[k] = this.maskValue(v);
            } else {
                redacted[k] = v;
            }
        }
        return redacted;
    }

    private sanitizeBody(body: unknown): unknown {
        if (body === null || body === undefined) return body;
        if (typeof body === 'string') return this.maybeMaskTokenString(body);
        if (Array.isArray(body)) return body.map((i) => this.sanitizeBody(i));
        if (typeof body === 'object') {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
                if (/^(password|token|secret|apiKey|authorization)$/i.test(k)) {
                    out[k] = '***redacted***';
                } else {
                    out[k] = this.sanitizeBody(v);
                }
            }
            return out;
        }
        return body;
    }

    private maskValue(value: string) {
        if (!value) return value;
        const prefixes = ['Bearer ', 'Token ', 'token ', 'bearer '];
        const prefix = prefixes.find(p => value.startsWith(p));
        const raw = prefix ? value.slice(prefix.length) : value;
        const masked = raw.length <= 10 ? '***redacted***' : `${raw.slice(0, 6)}…${raw.slice(-4)}`;
        return prefix ? `${prefix}${masked}` : masked;
    }

    private maybeMaskTokenString(value: string) {
        if (/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(value)) {
            return this.maskValue(value);
        }
        return value;
    }

    logRequest(method: string, url: string, headers: Record<string, string>, body?: any) {
        const safe = {
            type: 'request',
            method,
            url,
            headers: this.sanitizeHeaders(headers),
            body: this.sanitizeBody(body)
        };
        this.recentLogs.push({ type: 'Request Details', data: safe });
        console.log('API Request:', safe);
    }

    logResponse(statusCode: number, headers: Record<string, string>, body?: unknown) {
        const safe = {
            statusCode,
            headers: this.sanitizeHeaders(headers),
            body: this.sanitizeBody(body)
        };
        this.recentLogs.push({ type: 'Response Details', data: safe });
        console.log('API Response:', safe);
    }

    getRecentLogs() {
        const logs = this.recentLogs.map(log => {
            return `===${log.type}===\n${JSON.stringify(log.data, null, 4)}`;
        }).join(`\n\n`)
        return logs;
    }
}
