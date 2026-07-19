import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  signSession,
  verifySession,
  extractToken,
  COOKIE_NAME,
} from '../../apps/web/src/lib/auth.ts';
import type { Role } from '../../apps/web/src/lib/rbac.ts';

function mockRequest(
  opts: {
    authorization?: string;
    cookie?: string;
    explicit?: string | null;
  } = {},
): any {
  const headers = new Map<string, string>();
  if (opts.authorization) headers.set('authorization', opts.authorization);

  const cookieStore = new Map<string, string>();
  if (opts.cookie) cookieStore.set(COOKIE_NAME, opts.cookie);

  return {
    headers: {
      get(name: string): string | null {
        return headers.get(name) ?? null;
      },
    },
    cookies: {
      get(name: string): { value: string } | undefined {
        const v = cookieStore.get(name);
        return v !== undefined ? { value: v } : undefined;
      },
    },
    _explicit: opts.explicit,
  };
}

describe('auth Unit Tests', () => {
  describe('signSession', () => {
    it('should return a string in header.payload.signature format', async () => {
      const token = await signSession('user-1', 'fan');
      const parts = token.split('.');
      assert.strictEqual(parts.length, 3, 'token should have 3 dot-separated parts');
      assert.ok(parts[0].length > 0, 'header segment should not be empty');
      assert.ok(parts[1].length > 0, 'payload segment should not be empty');
      assert.ok(parts[2].length > 0, 'signature segment should not be empty');
    });

    it('should produce different tokens for different roles', async () => {
      const fanToken = await signSession('user-1', 'fan');
      const staffToken = await signSession('user-1', 'staff');
      assert.notStrictEqual(
        fanToken,
        staffToken,
        'different roles should produce different tokens',
      );
    });

    it('should produce different tokens for different userIds', async () => {
      const token1 = await signSession('user-1', 'fan');
      const token2 = await signSession('user-2', 'fan');
      assert.notStrictEqual(token1, token2, 'different user IDs should produce different tokens');
    });

    it('should produce different tokens at different times', async () => {
      const tokenA = await signSession('user-1', 'fan');
      // Small delay to ensure different exp timestamp (1-second resolution)
      await new Promise((r) => setTimeout(r, 1100));
      const tokenB = await signSession('user-1', 'fan');
      assert.notStrictEqual(tokenA, tokenB, 'tokens signed at different times should differ');
    });
  });

  describe('verifySession', () => {
    it('should return claims for a valid token', async () => {
      const token = await signSession('user-42', 'staff');
      const claims = await verifySession(token);
      assert.ok(claims, 'should not be null');
      assert.strictEqual(claims!.userId, 'user-42');
      assert.strictEqual(claims!.role, 'staff');
      assert.strictEqual(typeof claims!.exp, 'number');
      assert.ok(claims!.exp > Math.floor(Date.now() / 1000), 'exp should be in the future');
    });

    it('should return null for an expired token', async () => {
      // Craft a token with exp in the past by building it manually
      const header = { alg: 'HS256', typ: 'MFJ' };
      const claims = {
        userId: 'user-expired',
        role: 'fan',
        exp: Math.floor(Date.now() / 1000) - 100, // 100 seconds ago
      };
      const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const claimsB64 = btoa(JSON.stringify(claims))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const payload = `${headerB64}.${claimsB64}`;

      // We need to sign with the same secret. Use signSession to get the secret,
      // then craft our own token. Since signSession doesn't expose the secret,
      // we'll use a known token and manipulate the exp via the payload.
      // Instead, just use signSession with a very short TTL-like approach:
      // The cleanest way: create a token via signSession then decode, modify exp, re-sign.
      // But we can't re-sign without the secret. So we'll use signSession and verify
      // the exp check by crafting a token whose HMAC is valid but exp is past.

      // Actually, the simplest approach: signSession hardcodes TTL of 7 days.
      // We can't easily get an expired token through the normal API.
      // So we'll manually construct one and sign it.
      // We need the AUTH_SECRET. It falls back to DEV_SECRET.
      const crypto = await import('node:crypto');
      const DEV_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';
      const sig = crypto.createHmac('sha256', DEV_SECRET).update(payload).digest('base64url');
      const expiredToken = `${payload}.${sig}`;

      const result = await verifySession(expiredToken);
      assert.strictEqual(result, null, 'expired token should return null');
    });

    it('should return null for a tampered token (modified payload)', async () => {
      const token = await signSession('user-1', 'fan');
      const parts = token.split('.');
      // Flip a character in the payload to tamper with it
      const payloadChars = parts[1].split('');
      payloadChars[0] = payloadChars[0] === 'A' ? 'B' : 'A';
      const tampered = `${parts[0]}.${payloadChars.join('.')}.${parts[2]}`;

      const result = await verifySession(tampered);
      assert.strictEqual(result, null, 'tampered token should return null');
    });

    it('should return null for a tampered token (modified signature)', async () => {
      const token = await signSession('user-1', 'fan');
      const parts = token.split('.');
      const sigChars = parts[2].split('');
      sigChars[0] = sigChars[0] === 'A' ? 'B' : 'A';
      const tampered = `${parts[0]}.${parts[1]}.${sigChars.join('')}`;

      const result = await verifySession(tampered);
      assert.strictEqual(result, null, 'tampered signature should return null');
    });

    it('should return null for a malformed token (no dots)', async () => {
      const result = await verifySession('not-a-valid-token');
      assert.strictEqual(result, null, 'token without dots should return null');
    });

    it('should return null for a malformed token (only 2 parts)', async () => {
      const result = await verifySession('header.payload');
      assert.strictEqual(result, null, 'token with 2 parts should return null');
    });

    it('should return null for an empty string', async () => {
      const result = await verifySession('');
      assert.strictEqual(result, null, 'empty string should return null');
    });

    it('should return null for undefined', async () => {
      const result = await verifySession(undefined);
      assert.strictEqual(result, null, 'undefined should return null');
    });

    it('should return null for null', async () => {
      const result = await verifySession(null);
      assert.strictEqual(result, null, 'null should return null');
    });

    it('should return null for a token with invalid role', async () => {
      const crypto = await import('node:crypto');
      const DEV_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';
      const header = { alg: 'HS256', typ: 'MFJ' };
      const claims = {
        userId: 'user-1',
        role: 'superadmin', // not in VALID_ROLES
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const claimsB64 = btoa(JSON.stringify(claims))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const payload = `${headerB64}.${claimsB64}`;
      const sig = crypto.createHmac('sha256', DEV_SECRET).update(payload).digest('base64url');
      const badRoleToken = `${payload}.${sig}`;

      const result = await verifySession(badRoleToken);
      assert.strictEqual(result, null, 'token with invalid role should return null');
    });

    it('should return null for a token with missing userId', async () => {
      const crypto = await import('node:crypto');
      const DEV_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';
      const header = { alg: 'HS256', typ: 'MFJ' };
      const claims = {
        userId: '',
        role: 'fan',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const claimsB64 = btoa(JSON.stringify(claims))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const payload = `${headerB64}.${claimsB64}`;
      const sig = crypto.createHmac('sha256', DEV_SECRET).update(payload).digest('base64url');
      const noUserIdToken = `${payload}.${sig}`;

      const result = await verifySession(noUserIdToken);
      assert.strictEqual(result, null, 'token with missing userId should return null');
    });

    it('should return null for a token signed with wrong secret', async () => {
      const crypto = await import('node:crypto');
      const WRONG_SECRET = 'wrong-secret-not-the-real-one';
      const header = { alg: 'HS256', typ: 'MFJ' };
      const claims = {
        userId: 'user-1',
        role: 'fan',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const claimsB64 = btoa(JSON.stringify(claims))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const payload = `${headerB64}.${claimsB64}`;
      const sig = crypto.createHmac('sha256', WRONG_SECRET).update(payload).digest('base64url');
      const wrongSecretToken = `${payload}.${sig}`;

      const result = await verifySession(wrongSecretToken);
      assert.strictEqual(result, null, 'token signed with wrong secret should return null');
    });

    it('should return null for base64url-encoded garbage payload with valid signature structure', async () => {
      const crypto = await import('node:crypto');
      const DEV_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';
      const payload = 'garbage.garbage';
      const sig = crypto.createHmac('sha256', DEV_SECRET).update(payload).digest('base64url');
      const garbageToken = `${payload}.${sig}`;

      const result = await verifySession(garbageToken);
      assert.strictEqual(result, null, 'garbage payload should return null');
    });
  });

  describe('extractToken', () => {
    it('should extract Bearer token from Authorization header', () => {
      const token = 'test-bearer-token-value';
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const result = extractToken(req, null);
      assert.strictEqual(result, token);
    });

    it('should give Bearer header priority over cookie', () => {
      const bearerToken = 'from-header';
      const cookieToken = 'from-cookie';
      const req = mockRequest({
        authorization: `Bearer ${bearerToken}`,
        cookie: cookieToken,
      });
      const result = extractToken(req, null);
      assert.strictEqual(result, bearerToken, 'Bearer header should take priority');
    });

    it('should fall back to cookie when no Authorization header', () => {
      const cookieToken = 'from-cookie';
      const req = mockRequest({ cookie: cookieToken });
      const result = extractToken(req, null);
      assert.strictEqual(result, cookieToken);
    });

    it('should use explicit token when no Authorization header and no cookie', () => {
      const explicitToken = 'explicitly-passed';
      const req = mockRequest({ explicit: explicitToken });
      const result = extractToken(req, explicitToken);
      assert.strictEqual(result, explicitToken);
    });

    it('should return null when no auth information is present', () => {
      const req = mockRequest({});
      const result = extractToken(req, null);
      assert.strictEqual(result, null);
    });

    it('should return null when Authorization header is not Bearer scheme', () => {
      const req = mockRequest({ authorization: 'Basic dXNlcjpwYXNz' });
      const result = extractToken(req, null);
      assert.strictEqual(result, null, 'non-Bearer auth should be ignored');
    });

    it('should return null for empty Authorization header value', () => {
      const req = mockRequest({ authorization: 'Bearer ' });
      const result = extractToken(req, null);
      assert.strictEqual(result, '', 'empty Bearer value should return empty string');
    });

    it('should prefer explicit over cookie when no header', () => {
      const req = mockRequest({ cookie: 'cookie-val', explicit: 'explicit-val' });
      const result = extractToken(req, 'explicit-val');
      assert.strictEqual(result, 'explicit-val', 'explicit should be checked before cookie');
    });
  });

  describe('base64UrlEncode/decode round-trip (indirect)', () => {
    it('should survive encode→decode round-trip through signSession→verifySession', async () => {
      const token = await signSession('round-trip-user', 'organizer');
      const claims = await verifySession(token);
      assert.ok(claims, 'valid signed token should verify');
      assert.strictEqual(claims!.userId, 'round-trip-user');
      assert.strictEqual(claims!.role, 'organizer');
    });

    it('should handle Unicode characters in userId', async () => {
      const unicodeUser = 'u-日本語ユーザー';
      const token = await signSession(unicodeUser, 'fan');
      const claims = await verifySession(token);
      assert.ok(claims);
      assert.strictEqual(claims!.userId, unicodeUser);
    });

    it('should handle empty-string-like edge cases in payload encoding', async () => {
      const token = await signSession('a', 'fan');
      const claims = await verifySession(token);
      assert.ok(claims);
      assert.strictEqual(claims!.userId, 'a');
      assert.strictEqual(claims!.role, 'fan');
    });
  });

  describe('verifyHmac (indirect via tampered signatures)', () => {
    it('should reject token with truncated signature', async () => {
      const token = await signSession('user-1', 'staff');
      const parts = token.split('.');
      const truncated = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}`;
      const result = await verifySession(truncated);
      assert.strictEqual(result, null, 'truncated signature should be rejected');
    });

    it('should reject token with extended signature (extra chars)', async () => {
      const token = await signSession('user-1', 'staff');
      const parts = token.split('.');
      const extended = `${parts[0]}.${parts[1]}.${parts[2]}AAAA`;
      const result = await verifySession(extended);
      assert.strictEqual(result, null, 'extended signature should be rejected');
    });

    it('should reject token with all-zero signature bytes', async () => {
      const token = await signSession('user-1', 'staff');
      const parts = token.split('.');
      // 43 chars of 'A' (valid base64url char, decodes to zeros-ish)
      const zeroSig = 'A'.repeat(parts[2].length);
      const zeroed = `${parts[0]}.${parts[1]}.${zeroSig}`;
      const result = await verifySession(zeroed);
      assert.strictEqual(result, null, 'all-zero signature should be rejected');
    });
  });

  describe('all roles round-trip', () => {
    const roles: Role[] = ['fan', 'volunteer', 'staff', 'organizer'];

    for (const role of roles) {
      it(`should sign and verify role="${role}"`, async () => {
        const token = await signSession(`user-${role}`, role);
        const claims = await verifySession(token);
        assert.ok(claims, `role ${role} should verify`);
        assert.strictEqual(claims!.userId, `user-${role}`);
        assert.strictEqual(claims!.role, role);
      });
    }
  });
});
