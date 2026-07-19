import { test, describe, it } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------
// RBAC Edge-Case & Boundary-Condition Tests
//
// Directly exercises enforceServer() with invalid inputs (unknown collections,
// unknown actions, unknown roles) and verifies that every role × invalid-action
// combination is properly denied.
// ---------------------------------------------------------------------------

import { enforceServer, AuthError } from '../../apps/web/src/lib/rbac.ts';
import type { Role, Action, Collection } from '../../apps/web/src/lib/rbac.ts';

const VALID_ROLES: Role[] = ['fan', 'volunteer', 'staff', 'organizer'];
const ALL_ACTIONS: Action[] = ['read', 'write', 'create', 'update', 'delete'];
const ALL_COLLECTIONS: Collection[] = [
  'concourseGraph',
  'congestionState',
  'reports',
  'incidents',
  'dispatches',
  'sessions',
];

// ---------------------------------------------------------------------------
// Unknown collection
// ---------------------------------------------------------------------------

describe('enforceServer — unknown collection', () => {
  it('should throw AuthError with status 400 for unknown collection', () => {
    assert.throws(
      () => enforceServer('fan', 'read', 'nonexistent' as any),
      (err: any) => err instanceof AuthError && err.status === 400,
    );
  });

  it('should throw AuthError with status 400 for completely bogus collection', () => {
    assert.throws(
      () => enforceServer('fan', 'write', 'secret_admin_panel' as any),
      (err: any) => err instanceof AuthError && err.status === 400,
    );
  });
});

// ---------------------------------------------------------------------------
// Unknown action
// ---------------------------------------------------------------------------

describe('enforceServer — unknown action', () => {
  it('should throw for unknown action on a known collection', () => {
    assert.throws(
      () => enforceServer('fan', 'purge' as any, 'incidents'),
      (err: any) => err instanceof AuthError,
    );
  });

  it('should throw for unknown action on concourseGraph', () => {
    assert.throws(
      () => enforceServer('fan', 'reindex' as any, 'concourseGraph'),
      (err: any) => err instanceof AuthError,
    );
  });

  it('should throw for unknown action on sessions', () => {
    assert.throws(
      () => enforceServer('fan', 'rotate' as any, 'sessions'),
      (err: any) => err instanceof AuthError,
    );
  });
});

// ---------------------------------------------------------------------------
// Unknown role
// ---------------------------------------------------------------------------

describe('enforceServer — unknown role', () => {
  it('should fall through to unknown-collection error for an unknown role on a valid collection', () => {
    // An unknown role bypasses the role-specific branches and hits the
    // final fallthrough at the bottom of the function.
    assert.throws(
      () => enforceServer('superadmin' as any, 'read', 'incidents'),
      (err: any) => err instanceof AuthError,
    );
  });

  it('should throw for unknown role attempting write on concourseGraph', () => {
    // concourseGraph allows public read but write is restricted to known roles.
    assert.throws(
      () => enforceServer('hacker' as any, 'write', 'concourseGraph'),
      (err: any) => err instanceof AuthError,
    );
  });
});

// ---------------------------------------------------------------------------
// Each role × invalid action combinations — deny matrix
// ---------------------------------------------------------------------------

describe('enforceServer — role × invalid-action deny matrix', () => {
  // Forbidden action combos: (role, action, collection) → must throw 403
  const forbiddenCombos: Array<{
    role: Role;
    action: Action;
    collection: Collection;
    desc: string;
  }> = [
    // fan cannot write/create/update/delete anything except public reads
    {
      role: 'fan',
      action: 'write',
      collection: 'concourseGraph',
      desc: 'fan cannot write concourseGraph',
    },
    {
      role: 'fan',
      action: 'create',
      collection: 'concourseGraph',
      desc: 'fan cannot create concourseGraph',
    },
    {
      role: 'fan',
      action: 'delete',
      collection: 'concourseGraph',
      desc: 'fan cannot delete concourseGraph',
    },
    { role: 'fan', action: 'read', collection: 'incidents', desc: 'fan cannot read incidents' },
    { role: 'fan', action: 'write', collection: 'incidents', desc: 'fan cannot write incidents' },
    { role: 'fan', action: 'read', collection: 'dispatches', desc: 'fan cannot read dispatches' },
    { role: 'fan', action: 'write', collection: 'sessions', desc: 'fan cannot write sessions' },

    // volunteer cannot read/write incidents or dispatches
    {
      role: 'volunteer',
      action: 'read',
      collection: 'incidents',
      desc: 'volunteer cannot read incidents',
    },
    {
      role: 'volunteer',
      action: 'write',
      collection: 'incidents',
      desc: 'volunteer cannot write incidents',
    },
    {
      role: 'volunteer',
      action: 'create',
      collection: 'incidents',
      desc: 'volunteer cannot create incidents',
    },
    {
      role: 'volunteer',
      action: 'read',
      collection: 'dispatches',
      desc: 'volunteer cannot read dispatches',
    },
    {
      role: 'volunteer',
      action: 'write',
      collection: 'concourseGraph',
      desc: 'volunteer cannot write concourseGraph',
    },
    {
      role: 'volunteer',
      action: 'delete',
      collection: 'reports',
      desc: 'volunteer cannot delete reports',
    },
    {
      role: 'volunteer',
      action: 'write',
      collection: 'sessions',
      desc: 'volunteer cannot write sessions',
    },

    // staff cannot write/update/delete congestionState or sessions
    {
      role: 'staff',
      action: 'write',
      collection: 'congestionState',
      desc: 'staff cannot write congestionState',
    },
    {
      role: 'staff',
      action: 'update',
      collection: 'congestionState',
      desc: 'staff cannot update congestionState',
    },
    {
      role: 'staff',
      action: 'delete',
      collection: 'congestionState',
      desc: 'staff cannot delete congestionState',
    },
    { role: 'staff', action: 'write', collection: 'sessions', desc: 'staff cannot write sessions' },
    {
      role: 'staff',
      action: 'delete',
      collection: 'dispatches',
      desc: 'staff cannot delete dispatches',
    },
    {
      role: 'staff',
      action: 'update',
      collection: 'dispatches',
      desc: 'staff cannot update dispatches',
    },
    {
      role: 'staff',
      action: 'delete',
      collection: 'incidents',
      desc: 'staff cannot delete incidents',
    },

    // organizer cannot mutate dispatches (immutable audit)
    {
      role: 'organizer',
      action: 'update',
      collection: 'dispatches',
      desc: 'organizer cannot update dispatches',
    },
    {
      role: 'organizer',
      action: 'delete',
      collection: 'dispatches',
      desc: 'organizer cannot delete dispatches',
    },
  ];

  for (const combo of forbiddenCombos) {
    it(`should deny: ${combo.desc}`, () => {
      assert.throws(
        () => enforceServer(combo.role, combo.action, combo.collection),
        (err: any) => {
          assert.ok(err instanceof AuthError, `Expected AuthError, got ${err?.constructor?.name}`);
          assert.strictEqual(err.status, 403, `Expected 403, got ${err.status}`);
          return true;
        },
      );
    });
  }

  // Allowed combos that must NOT throw
  const allowedCombos: Array<{ role: Role; action: Action; collection: Collection; desc: string }> =
    [
      {
        role: 'fan',
        action: 'read',
        collection: 'concourseGraph',
        desc: 'fan can read concourseGraph',
      },
      {
        role: 'fan',
        action: 'read',
        collection: 'congestionState',
        desc: 'fan can read congestionState',
      },
      { role: 'fan', action: 'create', collection: 'reports', desc: 'fan can create reports' },
      {
        role: 'volunteer',
        action: 'create',
        collection: 'reports',
        desc: 'volunteer can create reports',
      },
      {
        role: 'volunteer',
        action: 'read',
        collection: 'concourseGraph',
        desc: 'volunteer can read concourseGraph',
      },
      { role: 'staff', action: 'read', collection: 'incidents', desc: 'staff can read incidents' },
      {
        role: 'staff',
        action: 'create',
        collection: 'incidents',
        desc: 'staff can create incidents',
      },
      {
        role: 'staff',
        action: 'update',
        collection: 'incidents',
        desc: 'staff can update incidents',
      },
      {
        role: 'staff',
        action: 'read',
        collection: 'dispatches',
        desc: 'staff can read dispatches',
      },
      {
        role: 'staff',
        action: 'create',
        collection: 'dispatches',
        desc: 'staff can create dispatches',
      },
      {
        role: 'organizer',
        action: 'read',
        collection: 'incidents',
        desc: 'organizer can read incidents',
      },
      {
        role: 'organizer',
        action: 'write',
        collection: 'congestionState',
        desc: 'organizer can write congestionState',
      },
      {
        role: 'organizer',
        action: 'delete',
        collection: 'incidents',
        desc: 'organizer can delete incidents',
      },
      {
        role: 'organizer',
        action: 'read',
        collection: 'dispatches',
        desc: 'organizer can read dispatches',
      },
      {
        role: 'organizer',
        action: 'create',
        collection: 'dispatches',
        desc: 'organizer can create dispatches',
      },
    ];

  for (const combo of allowedCombos) {
    it(`should allow: ${combo.desc}`, () => {
      assert.doesNotThrow(() => enforceServer(combo.role, combo.action, combo.collection));
    });
  }
});

// ---------------------------------------------------------------------------
// AuthError properties
// ---------------------------------------------------------------------------

describe('AuthError', () => {
  it('should default to status 401', () => {
    const err = new AuthError('unauthorized');
    assert.strictEqual(err.status, 401);
    assert.ok(err.message.includes('unauthorized'));
  });

  it('should accept custom status', () => {
    const err = new AuthError('forbidden', 403);
    assert.strictEqual(err.status, 403);
  });

  it('should be an instance of Error', () => {
    const err = new AuthError('test');
    assert.ok(err instanceof Error);
  });
});
