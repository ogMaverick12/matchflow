import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { IncidentSummarySchema, rankDispatches, RosterItem } from '../../packages/flow-engine/src/index.ts';

describe('flow-engine Unit Tests', () => {
  describe('IncidentSummarySchema validation', () => {
    it('should validate a correct incident summary object', () => {
      const valid = {
        summary: 'Water spill on Concourse level 100',
        description: 'Large puddle reported near concession burgers. Slip hazard.',
        severity: 'medium',
        confidence: 0.95
      };
      const parsed = IncidentSummarySchema.parse(valid);
      assert.deepStrictEqual(parsed, valid);
    });

    it('should fail validation when summary is too long', () => {
      const invalid = {
        summary: 'A'.repeat(81), // Max is 80
        description: 'Large puddle reported.',
        severity: 'medium',
        confidence: 0.95
      };
      assert.throws(() => {
        IncidentSummarySchema.parse(invalid);
      });
    });

    it('should fail validation when severity is invalid', () => {
      const invalid = {
        summary: 'Elevator power cut',
        description: 'Elevator north is stuck.',
        severity: 'critical', // Should be low, medium, or high
        confidence: 0.8
      };
      assert.throws(() => {
        IncidentSummarySchema.parse(invalid);
      });
    });

    it('should fail validation when confidence is out of bounds', () => {
      const invalid = {
        summary: 'Elevator power cut',
        description: 'Elevator north is stuck.',
        severity: 'high',
        confidence: 1.2 // Max is 1.0
      };
      assert.throws(() => {
        IncidentSummarySchema.parse(invalid);
      });
    });
  });

  describe('rankDispatches ranking logic', () => {
    it('should rank staff located in same zone higher than others, prioritizing staff over volunteers', () => {
      const roster: RosterItem[] = [
        { staffId: 'jean', name: 'Jean', role: 'volunteer', zone: 'Zone_B', status: 'On Duty' },
        { staffId: 'priya', name: 'Priya', role: 'staff', zone: 'Zone_A', status: 'Active' },
        { staffId: 'diego', name: 'Diego', role: 'volunteer', zone: 'Zone_A', status: 'On Duty' }
      ];

      const ranked = rankDispatches('inc_test', 'Zone_A', roster);

      assert.strictEqual(ranked.length, 3);
      
      // Priya should be first (same zone: +40, role staff: +10, base: 10 => 60)
      assert.strictEqual(ranked[0].staffId, 'priya');
      assert.strictEqual(ranked[0].rank, 60);

      // Diego should be second (same zone: +40, role volunteer: +0, base: 10 => 50)
      assert.strictEqual(ranked[1].staffId, 'diego');
      assert.strictEqual(ranked[1].rank, 50);

      // Jean should be third (diff zone: +0, role volunteer: +0, base: 10 => 10)
      assert.strictEqual(ranked[2].staffId, 'jean');
      assert.strictEqual(ranked[2].rank, 10);
    });
  });
});
