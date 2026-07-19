// Framework-agnostic RBAC matrix for MatchFlow. No Next.js / server imports
// so it can be used by both server routes and 'use client' components.
//
// Matrix (mirrors the intended firestore.rules):
//   fan            : read public (concourseGraph, congestionState); no writes
//   volunteer      : create reports + read OWN reports
//   staff/organizer: read/write incidents + read/create dispatches
//                    (dispatches immutable audit — no update/delete)
//   organizer-only : delete incidents, write concourseGraph/congestionState

export type Role = 'fan' | 'volunteer' | 'staff' | 'organizer';
export type Collection = 'concourseGraph' | 'congestionState' | 'reports' | 'incidents' | 'dispatches' | 'sessions';
export type Action = 'read' | 'write' | 'create' | 'update' | 'delete';

export const VALID_ROLES: Role[] = ['fan', 'volunteer', 'staff', 'organizer'];

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function enforceServer(
  role: Role,
  action: Action,
  collection: Collection,
  opts: { documentAuthorId?: string; requestUserId?: string } = {}
): void {
  if (role === 'organizer') {
    // Organizer can do everything except mutate dispatches (immutable audit).
    if (collection === 'dispatches' && action !== 'read' && action !== 'create') {
      throw new AuthError(`Role organizer cannot ${action} dispatches (immutable audit).`, 403);
    }
    return;
  }

  if (collection === 'concourseGraph' || collection === 'congestionState') {
    if (action === 'read') return; // public read
    throw new AuthError(`Role ${role} cannot ${action} ${collection}.`, 403);
  }

  if (collection === 'sessions') {
    if (action === 'read') return;
    throw new AuthError(`Role ${role} cannot ${action} sessions.`, 403);
  }

  if (collection === 'reports') {
    if (action === 'create') {
      if (role === 'volunteer' || role === 'staff') return;
      throw new AuthError(`Role ${role} cannot create reports.`, 403);
    }
    if (action === 'read') {
      if (role === 'staff') return;
      if (role === 'volunteer') {
        if (opts.documentAuthorId && opts.requestUserId && opts.documentAuthorId === opts.requestUserId) return;
        throw new AuthError('Volunteer can only read own reports.', 403);
      }
      throw new AuthError(`Role ${role} cannot read reports.`, 403);
    }
    throw new AuthError(`Role ${role} cannot ${action} reports.`, 403);
  }

  if (collection === 'incidents') {
    if (action === 'read' || action === 'create' || action === 'update') {
      if (role === 'staff') return; // organizer already returned above
      throw new AuthError(`Role ${role} cannot ${action} incidents.`, 403);
    }
    if (action === 'delete') {
      throw new AuthError('Only organizer can delete incidents.', 403);
    }
    throw new AuthError(`Role ${role} cannot ${action} incidents.`, 403);
  }

  if (collection === 'dispatches') {
    if (action === 'read' || action === 'create') {
      if (role === 'staff') return; // organizer already returned above
      throw new AuthError(`Role ${role} cannot ${action} dispatches.`, 403);
    }
    // update/delete are blocked for everyone (immutable audit)
    throw new AuthError(`Dispatches are immutable — ${action} is not allowed.`, 403);
  }

  throw new AuthError(`Unknown collection ${collection}.`, 400);
}

// Client-side mirror — same matrix, throws on violation. Fast guard before
// issuing network requests; the server remains authoritative.
export function enforceClient(
  role: Role,
  action: Action,
  collection: Collection,
  opts: { documentAuthorId?: string; requestUserId?: string } = {}
): void {
  enforceServer(role, action, collection, opts);
}
