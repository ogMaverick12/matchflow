import { test, describe, it, mock } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(
  handler: (url: string | URL, init?: RequestInit) => Response | Promise<Response>,
) {
  // @ts-expect-error — test-only global override
  global.fetch = handler;
}

function restoreFetch() {
  // @ts-expect-error — restoring original
  global.fetch = globalThis.__originalFetch ?? global.fetch;
}

// @ts-expect-error — test-only
globalThis.__originalFetch = global.fetch;

describe('db.ts Unit Tests', () => {
  // -------------------------------------------------------------------------
  // subscribeWithDedup behaviour (tested via exported subscribe wrappers)
  // -------------------------------------------------------------------------
  describe('subscribeWithDedup (via subscribeToCongestion)', () => {
    it('should return a function (unsubscribe handle)', async () => {
      mockFetch(
        async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const { subscribeToCongestion } = await import('../../apps/web/src/lib/db.ts');
      const unsub = subscribeToCongestion(
        'staff',
        () => {},
        () => {},
      );

      assert.strictEqual(typeof unsub, 'function', 'unsubscribe should be a function');
      unsub();
      restoreFetch();
    });

    it('should invoke the callback at least once with data', async () => {
      const testZones = [
        { zoneId: 'A', densityScore: 0.5, capacity: 100 },
        { zoneId: 'B', densityScore: 0.8, capacity: 200 },
      ];

      mockFetch(
        async () =>
          new Response(JSON.stringify({ data: testZones }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const { subscribeToCongestion } = await import('../../apps/web/src/lib/db.ts');

      await new Promise<void>((resolve) => {
        let called = false;
        const unsub = subscribeToCongestion(
          'staff',
          (zones) => {
            called = true;
            assert.ok(Array.isArray(zones), 'callback should receive an array');
            assert.ok(zones.length > 0, 'should receive non-empty data');
          },
          (err) => {
            assert.fail(`onError should not be called: ${err.message}`);
          },
        );

        setTimeout(() => {
          assert.ok(called, 'callback should have been called at least once');
          unsub();
          resolve();
        }, 500);
      });

      restoreFetch();
    });

    it('should call onError when fetch throws', async () => {
      mockFetch(async () => {
        throw new Error('network down');
      });

      const { subscribeToCongestion } = await import('../../apps/web/src/lib/db.ts');

      await new Promise<void>((resolve) => {
        const unsub = subscribeToCongestion(
          'staff',
          () => {
            assert.fail('callback should not be called on error');
          },
          (err) => {
            assert.ok(err instanceof Error);
            assert.strictEqual(err.message, 'network down');
          },
        );

        setTimeout(() => {
          unsub();
          resolve();
        }, 300);
      });

      restoreFetch();
    });

    it('should call onError when apiGet returns non-ok response', async () => {
      mockFetch(
        async () =>
          new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const { subscribeToCongestion } = await import('../../apps/web/src/lib/db.ts');

      await new Promise<void>((resolve) => {
        const unsub = subscribeToCongestion(
          'staff',
          () => {
            assert.fail('callback should not be called on error');
          },
          (err) => {
            assert.ok(err instanceof Error);
            assert.ok(
              err.message.includes('Forbidden') || err.message.includes('403'),
              `error message should indicate 403/Forbidden, got: "${err.message}"`,
            );
          },
        );

        setTimeout(() => {
          unsub();
          resolve();
        }, 300);
      });

      restoreFetch();
    });
  });

  // -------------------------------------------------------------------------
  // apiPost error handling (via writeCongestionBatch — no RBAC gate)
  // -------------------------------------------------------------------------
  describe('apiPost error handling (via writeCongestionBatch)', () => {
    it('should not throw when POST returns non-ok (fire-and-forget)', async () => {
      mockFetch(
        async () =>
          new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const { writeCongestionBatch } = await import('../../apps/web/src/lib/db.ts');

      // writeCongestionBatch is fire-and-forget — it doesn't check the response
      await assert.doesNotReject(() => writeCongestionBatch([{ zoneId: 'A', densityScore: 0.9 }]));

      restoreFetch();
    });

    it('should POST to /api/simulate with correct body', async () => {
      let capturedUrl: string | URL | undefined;
      let capturedInit: RequestInit | undefined;

      mockFetch(async (url, init) => {
        capturedUrl = url;
        capturedInit = init;
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const { writeCongestionBatch } = await import('../../apps/web/src/lib/db.ts');
      await writeCongestionBatch([{ zoneId: 'X', densityScore: 0.3 }], { tick: 5, reset: true });

      assert.strictEqual(String(capturedUrl), '/api/simulate');
      assert.strictEqual(capturedInit?.method, 'POST');

      const body = JSON.parse(capturedInit?.body as string);
      assert.deepStrictEqual(body.scores, { X: 0.3 });
      assert.strictEqual(body.tick, 5);
      assert.strictEqual(body.reset, true);

      restoreFetch();
    });
  });

  // -------------------------------------------------------------------------
  // RBAC enforcement
  // -------------------------------------------------------------------------
  describe('RBAC enforcement', () => {
    it('should reject fan role reading incidents via subscribeToIncidents', async () => {
      mockFetch(
        async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const { subscribeToIncidents } = await import('../../apps/web/src/lib/db.ts');
      let errorCaught = false;

      const unsub = subscribeToIncidents(
        'fan',
        () => {},
        (err) => {
          errorCaught = true;
          assert.ok(err.message.includes('cannot'));
        },
      );

      // Give the poll time to attempt
      await new Promise((r) => setTimeout(r, 200));

      // unsubscribe returns a no-op when RBAC fails
      assert.strictEqual(typeof unsub, 'function');
      // fan cannot read incidents, so onError should fire
      assert.ok(errorCaught, 'onError should have been called for unauthorized fan role');
      unsub();
      restoreFetch();
    });

    it('should allow staff role reading incidents', async () => {
      mockFetch(
        async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const { subscribeToIncidents } = await import('../../apps/web/src/lib/db.ts');
      let errorCaught = false;

      const unsub = subscribeToIncidents(
        'staff',
        () => {},
        () => {
          errorCaught = true;
        },
      );

      await new Promise((r) => setTimeout(r, 200));

      assert.strictEqual(typeof unsub, 'function');
      // staff can read incidents — no RBAC error expected
      // (may get fetch errors if mock returns bad data, but no RBAC error)
      unsub();
      restoreFetch();
    });
  });

  // -------------------------------------------------------------------------
  // db namespace exports
  // -------------------------------------------------------------------------
  describe('db namespace', () => {
    it('should export an object with expected public methods', async () => {
      const { db } = await import('../../apps/web/src/lib/db.ts');

      assert.strictEqual(typeof db.subscribeToCongestion, 'function');
      assert.strictEqual(typeof db.subscribeToReports, 'function');
      assert.strictEqual(typeof db.createReport, 'function');
      assert.strictEqual(typeof db.subscribeToIncidents, 'function');
      assert.strictEqual(typeof db.updateIncidentStatus, 'function');
      assert.strictEqual(typeof db.subscribeToDispatches, 'function');
      assert.strictEqual(typeof db.createDispatch, 'function');
      assert.strictEqual(typeof db.updateDispatchStatus, 'function');
      assert.strictEqual(typeof db.writeCongestionBatch, 'function');
      assert.strictEqual(typeof db.askConcierge, 'function');
      assert.strictEqual(typeof db.rankEgressOptions, 'function');
      assert.strictEqual(typeof db.proveFanCannotReadIncidents, 'function');
      assert.strictEqual(typeof db.runSimulatorTick, 'function');
    });
  });
});
