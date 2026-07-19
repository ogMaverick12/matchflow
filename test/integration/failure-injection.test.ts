import { test, describe, it } from 'node:test';
import assert from 'node:assert';

// Set emulator environment variables before any firebase import
process.env.GCLOUD_PROJECT = 'matchflow-demo';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// No firebase-admin module-level mock needed — we inject via _setDb below.

// 2. Import the Cloud Function handler and DB injection hook
import { askConcierge, _setDb } from '../../apps/functions/src/index.ts';

// Inject mock Firestore client so Firestore is never really called
const mockWhereChain = {
  where: () => mockWhereChain,
  get: async () => ({ empty: true, docs: [], forEach: () => {} }),
};
_setDb({
  collection: () => ({
    get: async () => ({ forEach: () => {} }),
    doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }),
    where: () => mockWhereChain,
  }),
} as any);

describe('askConcierge Failure Injection & Fallback Tests', () => {
  it('should trigger the deterministic fallback and return a valid route when query is forced to timeout', async () => {
    // Construct the request object for onCall v2 functions
    const mockRequest = {
      data: {
        query: 'Where is the nearest restroom? force_timeout',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    // Call the function handler's .run() method
    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.detectedLanguage, 'en');
    assert.ok(response.data.answerText.toLowerCase().includes('restroom'));
    assert.ok(response.data.route);
    assert.deepStrictEqual(response.data.route.path, ['gate_1', 'restroom_101']);
  });

  it('should fall back gracefully to English/Spanish when language is not supported during failure', async () => {
    const mockRequest = {
      data: {
        query: 'puerta 1 force_timeout',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'unknown',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    // Should auto-detect Spanish based on "puerta 1"
    assert.strictEqual(response.data.detectedLanguage, 'es');
    assert.ok(response.data.answerText.toLowerCase().includes('ruta'));
    assert.ok(response.data.route);
  });

  it('should resolve gate keyword to correct node in deterministic mode', async () => {
    const mockRequest = {
      data: {
        query: 'Where is gate 3? force_timeout',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.detectedLanguage, 'en');
    assert.ok(response.data.route, 'Gate keyword should produce a route');
    assert.ok(response.data.route.path.includes('gate_3'), 'Route should include gate_3');
  });

  it('should resolve food keyword to correct node in deterministic mode', async () => {
    const mockRequest = {
      data: {
        query: 'I want burgers force_timeout',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.detectedLanguage, 'en');
    assert.ok(response.data.route, 'Food keyword should produce a route');
    assert.ok(
      response.data.route.path.includes('concession_burgers'),
      'Route should include concession_burgers',
    );
  });

  it('should resolve seating keyword to correct node in deterministic mode', async () => {
    const mockRequest = {
      data: {
        query: 'Take me to section 110 force_timeout',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.detectedLanguage, 'en');
    assert.ok(response.data.route, 'Seating keyword should produce a route');
    assert.ok(response.data.route.path.includes('seating_110'), 'Route should include seating_110');
  });

  it('should auto-detect French when query contains toilette', async () => {
    const mockRequest = {
      data: {
        query: 'Où est la toilette?',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.detectedLanguage, 'fr');
    // "toilette" contains "toilet" so it matches the restroom keyword → restroom_101
    assert.ok(response.data.route, 'French restroom query should produce a route');
    assert.ok(response.data.route.path.includes('restroom_101'));
  });

  it('should auto-detect Portuguese when query contains onde', async () => {
    const mockRequest = {
      data: {
        query: 'Onde fica o gate 1?',
        sessionId: 'sess_123',
        userId: 'user_123',
        role: 'fan' as const,
        language: 'en',
        accessibilityMode: {
          mobilityRouting: false,
          highContrast: false,
          simplifiedLanguage: false,
        },
      },
    };

    const response = await (askConcierge as any).run(mockRequest);

    assert.ok(response);
    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.detectedLanguage, 'pt');
    // "gate 1" maps to gate_1, start defaults to gate_1, so identity route
    assert.ok(response.data.route, 'Portuguese gate query should produce a route');
    assert.deepStrictEqual(response.data.route.path, ['gate_1']);
  });
});
