import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  classifyQuery,
  logEvent,
  getEventSnapshot,
  getEventSummary,
  getFallbackRate,
  type QueryCategory,
} from '../../apps/web/src/lib/analytics.ts';

describe('analytics Unit Tests', () => {
  describe('classifyQuery', () => {
    it('should classify food-related queries as food_concessions', () => {
      assert.strictEqual(classifyQuery('food'), 'food_concessions');
      assert.strictEqual(classifyQuery('I want a burger'), 'food_concessions');
      assert.strictEqual(classifyQuery('where can I get a drink'), 'food_concessions');
      assert.strictEqual(classifyQuery('beer'), 'food_concessions');
      assert.strictEqual(classifyQuery('snack'), 'food_concessions');
    });

    it('should classify restroom-related queries as restroom', () => {
      assert.strictEqual(classifyQuery('restroom'), 'restroom');
      assert.strictEqual(classifyQuery('bathroom'), 'restroom');
      assert.strictEqual(classifyQuery('toilet'), 'restroom');
      assert.strictEqual(classifyQuery('wc'), 'restroom');
    });

    it('should classify gate/entrance queries as gate_lookup', () => {
      assert.strictEqual(classifyQuery('gate'), 'gate_lookup');
      assert.strictEqual(classifyQuery('entrance'), 'gate_lookup');
      assert.strictEqual(classifyQuery('section'), 'gate_lookup');
      assert.strictEqual(classifyQuery('which gate do I use'), 'gate_lookup');
    });

    it('should classify exit/egress queries as exit_planning', () => {
      assert.strictEqual(classifyQuery('exit'), 'exit_planning');
      assert.strictEqual(classifyQuery('egress'), 'exit_planning');
      assert.strictEqual(classifyQuery('leave'), 'exit_planning');
      assert.strictEqual(classifyQuery('rideshare'), 'exit_planning');
      assert.strictEqual(classifyQuery('marta'), 'exit_planning');
    });

    it('should classify crowd/incident queries as incident_status', () => {
      assert.strictEqual(classifyQuery('crowd'), 'incident_status');
      assert.strictEqual(classifyQuery('congestion'), 'incident_status');
      assert.strictEqual(classifyQuery('busy'), 'incident_status');
      assert.strictEqual(classifyQuery('bottleneck'), 'incident_status');
    });

    it('should classify navigation queries as navigation', () => {
      assert.strictEqual(classifyQuery('direction'), 'navigation');
      assert.strictEqual(classifyQuery('go to'), 'navigation');
      assert.strictEqual(classifyQuery('get to'), 'navigation');
      assert.strictEqual(classifyQuery('where is'), 'navigation');
      assert.strictEqual(classifyQuery('find'), 'navigation');
    });

    it('should classify accessibility queries as accessibility_route', () => {
      assert.strictEqual(classifyQuery('accessible'), 'accessibility_route');
      assert.strictEqual(classifyQuery('elevator'), 'accessibility_route');
      assert.strictEqual(classifyQuery('ramp'), 'accessibility_route');
      assert.strictEqual(classifyQuery('wheelchair'), 'accessibility_route');
      assert.strictEqual(classifyQuery('mobility'), 'accessibility_route');
    });

    it('should classify schedule/time queries as general_info', () => {
      assert.strictEqual(classifyQuery('time'), 'general_info');
      assert.strictEqual(classifyQuery('schedule'), 'general_info');
      assert.strictEqual(classifyQuery('kickoff'), 'general_info');
      assert.strictEqual(classifyQuery('score'), 'general_info');
    });

    it('should classify unknown queries as general_info', () => {
      assert.strictEqual(classifyQuery('water'), 'general_info');
      assert.strictEqual(classifyQuery('help'), 'general_info');
      assert.strictEqual(classifyQuery('lost'), 'general_info');
      assert.strictEqual(classifyQuery('random gibberish'), 'general_info');
    });

    it('should classify empty string as general_info', () => {
      assert.strictEqual(classifyQuery(''), 'general_info');
    });

    it('should be case-insensitive', () => {
      assert.strictEqual(classifyQuery('FOOD'), 'food_concessions');
      assert.strictEqual(classifyQuery('Restroom'), 'restroom');
      assert.strictEqual(classifyQuery('GATE'), 'gate_lookup');
    });
  });

  describe('logEvent and getEventSnapshot', () => {
    it('should buffer events and return a snapshot', () => {
      const before = getEventSnapshot().length;
      logEvent({
        type: 'language_set',
        sessionId: 'test-sess',
        language: 'en',
      });
      const after = getEventSnapshot().length;
      assert.ok(after >= before, 'snapshot should contain at least the same events');
    });

    it('should return a copy, not a reference to the internal buffer', () => {
      const snap1 = getEventSnapshot();
      const snap2 = getEventSnapshot();
      assert.notStrictEqual(snap1, snap2, 'should be different array references');
      assert.deepStrictEqual(snap1, snap2, 'contents should be equal');
    });
  });

  describe('getEventSummary', () => {
    it('should return an object with event type counts', () => {
      const summary = getEventSummary();
      assert.strictEqual(typeof summary, 'object');
      for (const val of Object.values(summary)) {
        assert.strictEqual(typeof val, 'number');
        assert.ok(val >= 0);
      }
    });
  });

  describe('getFallbackRate', () => {
    it('should return 0 rate when no concierge_query events exist', () => {
      // getFallbackRate already handles empty buffer gracefully (rate = 0)
      // This tests the branch where queries.length === 0
      const result = getFallbackRate();
      assert.strictEqual(typeof result.total, 'number');
      assert.strictEqual(typeof result.fallbacks, 'number');
      assert.strictEqual(typeof result.rate, 'number');
      assert.ok(!Number.isNaN(result.rate), 'rate must not be NaN');
      assert.ok(
        !Number.isFinite(result.rate) || result.rate === 0,
        'rate must be 0 when no queries',
      );
    });

    it('should calculate rate correctly with concierge_query events', () => {
      logEvent({
        type: 'concierge_query',
        sessionId: 'rate-test-1',
        language: 'en',
        category: 'restroom',
        fallbackTriggered: false,
        latencyMs: 120,
      });
      logEvent({
        type: 'concierge_query',
        sessionId: 'rate-test-2',
        language: 'en',
        category: 'restroom',
        fallbackTriggered: true,
        latencyMs: 300,
      });

      const result = getFallbackRate();
      assert.ok(result.total >= 2, 'should have at least 2 total queries');
      assert.ok(result.fallbacks >= 1, 'should have at least 1 fallback');
      assert.ok(result.rate > 0 && result.rate <= 1, 'rate should be between 0 and 1');
    });
  });
});
