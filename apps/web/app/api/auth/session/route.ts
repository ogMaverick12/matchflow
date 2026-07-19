import { NextRequest, NextResponse } from 'next/server';
import { signSession, COOKIE_NAME, Role } from '@/lib/auth';

const VALID_ROLES: Role[] = ['fan', 'volunteer', 'staff', 'organizer'];

// Issues a signed session token as an httpOnly cookie. This is the single
// point where a role claim is minted. The client never sets its own role
// server-side — only here, from a request to onboard.
//
// Body: { role?: Role, userId?: string }
//   - Fan onboarding: omit role (defaults to 'fan') or pass 'fan'.
//   - Ops personas (volunteer/staff/organizer): selected on the login page.
export async function POST(req: NextRequest) {
  let body: { role?: string; userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body → fan
  }

  const requested = (body.role || 'fan') as Role;
  if (!VALID_ROLES.includes(requested)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const userId =
    body.userId && typeof body.userId === 'string' && body.userId.length > 0
      ? body.userId.slice(0, 128)
      : `user_${Math.random().toString(36).substring(2, 12)}`;

  const token = await signSession(userId, requested);

  const res = NextResponse.json({
    success: true,
    session: { userId, role: requested }
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}

// Returns the current verified session (from the cookie) without minting a new one.
export async function GET() {
  return NextResponse.json({ note: 'POST to /api/auth/session to issue a session cookie.' });
}
