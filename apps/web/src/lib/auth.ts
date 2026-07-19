import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { Role, VALID_ROLES } from './rbac';

// Re-export the shared matrix + error so server routes can import everything
// auth-related from a single module.
export { enforceServer, AuthError, VALID_ROLES } from './rbac';
export type { Role, Collection, Action } from './rbac';

// ---------------------------------------------------------------------------
// Lightweight, dependency-free session auth for MatchFlow (server-only).
//
// No external auth provider. We issue an HMAC-signed token (role + userId +
// exp) stored in an httpOnly cookie. The role claim is the ONLY source of
// truth server-side — the client's localStorage role is never trusted.
//
// The signing secret comes from AUTH_SECRET (set in Vercel env). A dev
// fallback is used only when the env var is absent, so local builds work.
// ---------------------------------------------------------------------------

export const COOKIE_NAME = 'matchflow_session';
const DEV_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionClaims {
  userId: string;
  role: Role;
  exp: number; // unix seconds
}

function getSecret(): string {
  return process.env.AUTH_SECRET || DEV_SECRET;
}

function enc(): TextEncoder {
  return new TextEncoder();
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc().encode(data));
  return bufToBase64Url(new Uint8Array(sig));
}

async function verifyHmac(data: string, secret: string, sig: string): Promise<boolean> {
  const expected = await hmac(data, secret);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

function bufToBase64Url(buf: Uint8Array): string {
  let str = '';
  for (let i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncode(obj: object): string {
  return bufToBase64Url(enc().encode(JSON.stringify(obj)));
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function signSession(userId: string, role: Role): Promise<string> {
  const header = { alg: 'HS256', typ: 'MFJ' };
  const claims: SessionClaims = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS
  };
  const payload = `${base64UrlEncode(header)}.${base64UrlEncode(claims)}`;
  const sig = await hmac(payload, getSecret());
  return `${payload}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const payload = `${h}.${p}`;
  const ok = await verifyHmac(payload, getSecret(), sig);
  if (!ok) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(p)) as SessionClaims;
    if (!claims.userId || !VALID_ROLES.includes(claims.role)) return null;
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

// Extract the token from either the cookie (preferred), a Bearer header, or an
// explicitly provided token (e.g. from a client fetch / test). Allows tests to
// pass a token without needing the cookie jar.
export function extractToken(req: NextRequest, explicit?: string | null): string | null {
  if (explicit) return explicit;
  const fromCookie = req.cookies.get(COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Reads the session cookie outside of a request handler (e.g. in a Server
// Component) using next/headers.
export async function getServerSession(): Promise<SessionClaims | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifySession(token);
}
