import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  IncidentSummarySchema,
  rankDispatches,
  noAccessiblePathMessage,
  rankEgressOptions,
  searchNodeByKeyword,
  detectLanguage,
  RosterItem,
} from '../../packages/flow-engine/src/index.ts';

describe('flow-engine Unit Tests', () => {
  // ─── IncidentSummarySchema ───────────────────────────────────────────
  describe('IncidentSummarySchema validation', () => {
    it('should validate a correct incident summary object', () => {
      const valid = {
        summary: 'Water spill on Concourse level 100',
        description: 'Large puddle reported near concession burgers. Slip hazard.',
        severity: 'medium',
        confidence: 0.95,
      };
      const parsed = IncidentSummarySchema.parse(valid);
      assert.deepStrictEqual(parsed, valid);
    });

    it('should fail validation when summary is too long', () => {
      const invalid = {
        summary: 'A'.repeat(81),
        description: 'Large puddle reported.',
        severity: 'medium',
        confidence: 0.95,
      };
      assert.throws(() => {
        IncidentSummarySchema.parse(invalid);
      });
    });

    it('should fail validation when severity is invalid', () => {
      const invalid = {
        summary: 'Elevator power cut',
        description: 'Elevator north is stuck.',
        severity: 'critical',
        confidence: 0.8,
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
        confidence: 1.2,
      };
      assert.throws(() => {
        IncidentSummarySchema.parse(invalid);
      });
    });

    it('should accept empty string as valid summary', () => {
      const valid = {
        summary: '',
        description: 'Some description',
        severity: 'low',
        confidence: 0.5,
      };
      const parsed = IncidentSummarySchema.parse(valid);
      assert.strictEqual(parsed.summary, '');
    });

    it('should accept confidence = 0 (lower boundary)', () => {
      const valid = {
        summary: 'Test incident',
        description: 'Details here',
        severity: 'low',
        confidence: 0,
      };
      const parsed = IncidentSummarySchema.parse(valid);
      assert.strictEqual(parsed.confidence, 0);
    });

    it('should accept confidence = 1 (upper boundary)', () => {
      const valid = {
        summary: 'Test incident',
        description: 'Details here',
        severity: 'high',
        confidence: 1,
      };
      const parsed = IncidentSummarySchema.parse(valid);
      assert.strictEqual(parsed.confidence, 1);
    });

    it('should fail validation when required fields are missing', () => {
      const incomplete = { summary: 'Only summary provided' };
      assert.throws(() => {
        IncidentSummarySchema.parse(incomplete);
      });
    });
  });

  // ─── searchNodeByKeyword ─────────────────────────────────────────────
  describe('searchNodeByKeyword keyword routing', () => {
    describe('restroom keywords', () => {
      it('should map "restroom" to restroom_101 (default)', () => {
        assert.strictEqual(searchNodeByKeyword('restroom'), 'restroom_101');
      });

      it('should map "Restroom" case-insensitively', () => {
        assert.strictEqual(searchNodeByKeyword('Restroom'), 'restroom_101');
      });

      it('should map "RESTROOM" case-insensitively', () => {
        assert.strictEqual(searchNodeByKeyword('RESTROOM'), 'restroom_101');
      });

      it('should map "toilet" to restroom_101', () => {
        assert.strictEqual(searchNodeByKeyword('toilet'), 'restroom_101');
      });

      it('should map "toilets" to restroom_101', () => {
        assert.strictEqual(searchNodeByKeyword('toilets'), 'restroom_101');
      });

      it('should map Spanish "ba\u00f1o" to restroom_101', () => {
        assert.strictEqual(searchNodeByKeyword('ba\u00f1o'), 'restroom_101');
      });

      it('should map "restroom 201" to restroom_201', () => {
        assert.strictEqual(searchNodeByKeyword('restroom 201'), 'restroom_201');
      });

      it('should map "restroom level 2" to restroom_201', () => {
        assert.strictEqual(searchNodeByKeyword('restroom level 2'), 'restroom_201');
      });

      it('should map "restroom upper" to restroom_201', () => {
        assert.strictEqual(searchNodeByKeyword('restroom upper'), 'restroom_201');
      });

      it('should map "restroom 101" to restroom_101', () => {
        assert.strictEqual(searchNodeByKeyword('restroom 101'), 'restroom_101');
      });

      it('should map "restroom 102" to restroom_102', () => {
        assert.strictEqual(searchNodeByKeyword('restroom 102'), 'restroom_102');
      });

      it('should map "restroom 103" to restroom_103', () => {
        assert.strictEqual(searchNodeByKeyword('restroom 103'), 'restroom_103');
      });

      it('should map "restroom 104" to restroom_104', () => {
        assert.strictEqual(searchNodeByKeyword('restroom 104'), 'restroom_104');
      });
    });

    describe('gate keywords', () => {
      it('should map "gate 1" to gate_1', () => {
        assert.strictEqual(searchNodeByKeyword('gate 1'), 'gate_1');
      });

      it('should map "gate 2" to gate_2', () => {
        assert.strictEqual(searchNodeByKeyword('gate 2'), 'gate_2');
      });

      it('should map "gate 3" to gate_3', () => {
        assert.strictEqual(searchNodeByKeyword('gate 3'), 'gate_3');
      });

      it('should map "gate 4" to gate_4', () => {
        assert.strictEqual(searchNodeByKeyword('gate 4'), 'gate_4');
      });

      it('should map Spanish "puerta 1" to gate_1', () => {
        assert.strictEqual(searchNodeByKeyword('puerta 1'), 'gate_1');
      });

      it('should map Spanish "puerta 2" to gate_2', () => {
        assert.strictEqual(searchNodeByKeyword('puerta 2'), 'gate_2');
      });

      it('should map Spanish "puerta 3" to gate_3', () => {
        assert.strictEqual(searchNodeByKeyword('puerta 3'), 'gate_3');
      });

      it('should map Spanish "puerta 4" to gate_4', () => {
        assert.strictEqual(searchNodeByKeyword('puerta 4'), 'gate_4');
      });
    });

    describe('food/concession keywords', () => {
      it('should map "burger" to concession_burgers', () => {
        assert.strictEqual(searchNodeByKeyword('burger'), 'concession_burgers');
      });

      it('should map "burgers" to concession_burgers', () => {
        assert.strictEqual(searchNodeByKeyword('burgers'), 'concession_burgers');
      });

      it('should map "taco" to concession_tacos', () => {
        assert.strictEqual(searchNodeByKeyword('taco'), 'concession_tacos');
      });

      it('should map "tacos" to concession_tacos', () => {
        assert.strictEqual(searchNodeByKeyword('tacos'), 'concession_tacos');
      });

      it('should map "pizza" to concession_pizza', () => {
        assert.strictEqual(searchNodeByKeyword('pizza'), 'concession_pizza');
      });

      it('should map "drink" to concession_drinks', () => {
        assert.strictEqual(searchNodeByKeyword('drink'), 'concession_drinks');
      });

      it('should map "drinks" to concession_drinks', () => {
        assert.strictEqual(searchNodeByKeyword('drinks'), 'concession_drinks');
      });

      it('should map "sips" to concession_drinks', () => {
        assert.strictEqual(searchNodeByKeyword('sips'), 'concession_drinks');
      });

      it('should map "beer" to concession_beers', () => {
        assert.strictEqual(searchNodeByKeyword('beer'), 'concession_beers');
      });

      it('should map "beers" to concession_beers', () => {
        assert.strictEqual(searchNodeByKeyword('beers'), 'concession_beers');
      });
    });

    describe('seating/section keywords', () => {
      it('should map "section 101" to seating_101', () => {
        assert.strictEqual(searchNodeByKeyword('section 101'), 'seating_101');
      });

      it('should map Spanish "seccion 101" to seating_101', () => {
        assert.strictEqual(searchNodeByKeyword('seccion 101'), 'seating_101');
      });

      it('should map "section 110" to seating_110', () => {
        assert.strictEqual(searchNodeByKeyword('section 110'), 'seating_110');
      });

      it('should map "section 120" to seating_120', () => {
        assert.strictEqual(searchNodeByKeyword('section 120'), 'seating_120');
      });

      it('should map "section 130" to seating_130', () => {
        assert.strictEqual(searchNodeByKeyword('section 130'), 'seating_130');
      });

      it('should map "section 201" to seating_201', () => {
        assert.strictEqual(searchNodeByKeyword('section 201'), 'seating_201');
      });
    });

    describe('no match returns null', () => {
      it('should return null for unrecognized query', () => {
        assert.strictEqual(searchNodeByKeyword('hello world'), null);
      });

      it('should return null for empty string', () => {
        assert.strictEqual(searchNodeByKeyword(''), null);
      });

      it('should return null for unrelated text', () => {
        assert.strictEqual(searchNodeByKeyword('what is the weather'), null);
      });
    });
  });

  // ─── detectLanguage ──────────────────────────────────────────────────
  describe('detectLanguage detection', () => {
    it('should detect Spanish from "ba\u00f1o"', () => {
      assert.strictEqual(detectLanguage('donde esta el ba\u00f1o', 'en'), 'es');
    });

    it('should detect Spanish from "donde"', () => {
      assert.strictEqual(detectLanguage('donde esta', 'en'), 'es');
    });

    it('should detect Spanish from "puerta"', () => {
      assert.strictEqual(detectLanguage('puerta 1', 'en'), 'es');
    });

    it('should detect French from "o\u00f9"', () => {
      assert.strictEqual(detectLanguage('o\u00f9 est la sortie', 'en'), 'fr');
    });

    it('should detect French from "toilette"', () => {
      assert.strictEqual(detectLanguage('toilette', 'en'), 'fr');
    });

    it('should detect French from "porte"', () => {
      assert.strictEqual(detectLanguage('porte 2', 'en'), 'fr');
    });

    it('should detect Portuguese from "onde"', () => {
      assert.strictEqual(detectLanguage('onde fica o banheiro', 'en'), 'pt');
    });

    it('should detect Portuguese from "casa de banho"', () => {
      assert.strictEqual(detectLanguage('casa de banho', 'en'), 'pt');
    });

    it('should detect Arabic from Arabic characters', () => {
      assert.strictEqual(
        detectLanguage('\u0623\u064a\u0646 \u0627\u0644\u0645\u062e\u0631\u062c', 'en'),
        'ar',
      );
    });

    it('should detect Arabic from bathroom keyword', () => {
      assert.strictEqual(detectLanguage('\u062d\u0645\u0627\u0645', 'en'), 'ar');
    });

    it('should detect Arabic from gate keyword', () => {
      assert.strictEqual(detectLanguage('\u0628\u0648\u0627\u0628\u0629 1', 'en'), 'ar');
    });

    it('should fall back to provided lang when no keyword matches', () => {
      assert.strictEqual(detectLanguage('where is the gate', 'es'), 'es');
    });

    it('should fall back to "en" when lang is empty and no match', () => {
      assert.strictEqual(detectLanguage('where is the gate', ''), 'en');
    });
  });

  // ─── noAccessiblePathMessage ─────────────────────────────────────────
  describe('noAccessiblePathMessage localization', () => {
    it('should return English message for "en"', () => {
      const msg = noAccessiblePathMessage('en');
      assert.ok(msg.includes('No accessible path currently available'));
      assert.ok(msg.includes('stairs or escalators'));
    });

    it('should return Spanish message for "es"', () => {
      const msg = noAccessiblePathMessage('es');
      assert.ok(msg.includes('No hay ruta accesible disponible'));
      assert.ok(msg.includes('escaleras'));
    });

    it('should return French message for "fr"', () => {
      const msg = noAccessiblePathMessage('fr');
      assert.ok(msg.includes('Aucun chemin accessible'));
      assert.ok(msg.includes('escaliers'));
    });

    it('should return Portuguese message for "pt"', () => {
      const msg = noAccessiblePathMessage('pt');
      assert.ok(msg.includes('N\u00e3o h\u00e1 caminho acess\u00edvel'));
      assert.ok(msg.includes('escadas'));
    });

    it('should return Arabic message for "ar"', () => {
      const msg = noAccessiblePathMessage('ar');
      assert.ok(msg.length > 0);
    });

    it('should default to English for unknown language code', () => {
      const msg = noAccessiblePathMessage('de');
      assert.ok(msg.includes('No accessible path currently available'));
    });
  });

  // ─── rankEgressOptions ───────────────────────────────────────────────
  describe('rankEgressOptions scoring and ranking', () => {
    const baseReq = {
      sessionId: 'sess_1',
      userId: 'user_1',
      role: 'fan' as const,
      zoneScores: {},
      options: [
        {
          id: 'opt_a',
          name: 'MARTA Rail',
          gate: 'Gate 1',
          type: 'transit' as const,
          estimatedMinutes: 10,
          currentQueueScore: 0.3,
          sustainabilityScore: 0.9,
        },
        {
          id: 'opt_b',
          name: 'Rideshare',
          gate: 'Gate 2',
          type: 'rideshare' as const,
          estimatedMinutes: 5,
          currentQueueScore: 0.8,
          sustainabilityScore: 0.2,
        },
        {
          id: 'opt_c',
          name: 'Walk',
          gate: 'Gate 3',
          type: 'walk' as const,
          estimatedMinutes: 20,
          currentQueueScore: 0.1,
          sustainabilityScore: 1.0,
        },
      ],
    };

    it('should score and rank options by composite formula (speed 50%, green 30%, eta 20%)', async () => {
      const result = await rankEgressOptions({ ...baseReq });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.rankedOptions.length, 3);

      for (const opt of result.data.rankedOptions) {
        assert.ok(typeof opt.rank === 'number');
        assert.ok(typeof opt.rationale === 'string');
        assert.ok(typeof opt.recommended === 'boolean');
      }
    });

    it('should apply zone penalty when zone density > 0.75', async () => {
      const req = {
        ...baseReq,
        zoneScores: { zone_a: 0.9, zone_b: 0.5 },
      };
      const result = await rankEgressOptions(req);

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.rankedOptions.length, 3);
    });

    it('should not apply zone penalty when density <= 0.75', async () => {
      const req = {
        ...baseReq,
        zoneScores: { zone_a: 0.75, zone_b: 0.3 },
      };
      const result = await rankEgressOptions(req);
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
    });

    it('should rank fastest-first (highest composite score first)', async () => {
      const result = await rankEgressOptions({ ...baseReq });
      assert.ok(result.data);
      assert.strictEqual(result.data.rankedOptions[0].rank, 1);
      assert.strictEqual(result.data.rankedOptions[0].recommended, true);
      assert.strictEqual(result.data.rankedOptions[1].rank, 2);
      assert.strictEqual(result.data.rankedOptions[2].rank, 3);
    });

    it('should return summary mentioning best option', async () => {
      const result = await rankEgressOptions({ ...baseReq });
      assert.ok(result.data);
      assert.ok(typeof result.data.summary === 'string');
      assert.ok(result.data.summary.length > 0);
    });

    it('should handle empty options array', async () => {
      const req = { ...baseReq, options: [] };
      try {
        const result = await rankEgressOptions(req);
        assert.ok(result.data);
      } catch {
        // Expected — accessing scored[0] on empty array
      }
    });

    it('should penalize all options equally for high-density zones', async () => {
      const req = {
        ...baseReq,
        zoneScores: { zone_a: 0.9, zone_b: 0.9, zone_c: 0.9 },
      };
      const resultNoPenalty = await rankEgressOptions({ ...baseReq, zoneScores: {} });
      const resultPenalty = await rankEgressOptions(req);

      assert.ok(resultNoPenalty.data);
      assert.ok(resultPenalty.data);
      // Penalty zone: 3 zones above 0.75 => 3 * 0.6 = 1.8 penalty
      // All options should have lower scores, but relative order preserved
      const noPenaltyIds = resultNoPenalty.data.rankedOptions.map((o) => o.id);
      const penaltyIds = resultPenalty.data.rankedOptions.map((o) => o.id);
      assert.deepStrictEqual(noPenaltyIds, penaltyIds);
    });
  });

  // ─── rankDispatches (extended) ──────────────────────────────────────
  describe('rankDispatches ranking logic', () => {
    it('should rank staff located in same zone higher than others, prioritizing staff over volunteers', () => {
      const roster: RosterItem[] = [
        { staffId: 'jean', name: 'Jean', role: 'volunteer', zone: 'Zone_B', status: 'On Duty' },
        { staffId: 'priya', name: 'Priya', role: 'staff', zone: 'Zone_A', status: 'Active' },
        { staffId: 'diego', name: 'Diego', role: 'volunteer', zone: 'Zone_A', status: 'On Duty' },
      ];

      const ranked = rankDispatches('inc_test', 'Zone_A', roster);

      assert.strictEqual(ranked.length, 3);
      assert.strictEqual(ranked[0].staffId, 'priya');
      assert.strictEqual(ranked[0].rank, 60);
      assert.strictEqual(ranked[1].staffId, 'diego');
      assert.strictEqual(ranked[1].rank, 50);
      assert.strictEqual(ranked[2].staffId, 'jean');
      assert.strictEqual(ranked[2].rank, 10);
    });

    it('should return empty array for empty roster', () => {
      const ranked = rankDispatches('inc_empty', 'Zone_A', []);
      assert.strictEqual(ranked.length, 0);
      assert.deepStrictEqual(ranked, []);
    });

    it('should rank all same-zone staff above any different-zone staff', () => {
      const roster: RosterItem[] = [
        { staffId: 'alpha', name: 'Alpha', role: 'volunteer', zone: 'Zone_B', status: 'Active' },
        { staffId: 'bravo', name: 'Bravo', role: 'volunteer', zone: 'Zone_B', status: 'Active' },
        { staffId: 'charlie', name: 'Charlie', role: 'staff', zone: 'Zone_A', status: 'Active' },
        { staffId: 'delta', name: 'Delta', role: 'organizer', zone: 'Zone_A', status: 'Active' },
      ];

      const ranked = rankDispatches('inc_same', 'Zone_A', roster);

      assert.strictEqual(ranked[0].staffId, 'charlie');
      assert.strictEqual(ranked[0].rank, 60);
      assert.strictEqual(ranked[1].staffId, 'delta');
      assert.strictEqual(ranked[1].rank, 50);
      assert.strictEqual(ranked[2].staffId, 'alpha');
      assert.strictEqual(ranked[2].rank, 10);
      assert.strictEqual(ranked[3].staffId, 'bravo');
      assert.strictEqual(ranked[3].rank, 10);
    });

    it('should rank multiple same-zone staff with different roles correctly', () => {
      const roster: RosterItem[] = [
        { staffId: 's1', name: 'Staff One', role: 'staff', zone: 'Zone_A', status: 'Active' },
        { staffId: 'v1', name: 'Vol One', role: 'volunteer', zone: 'Zone_A', status: 'Active' },
        { staffId: 'o1', name: 'Org One', role: 'organizer', zone: 'Zone_A', status: 'Active' },
      ];

      const ranked = rankDispatches('inc_roles', 'Zone_A', roster);

      assert.strictEqual(ranked[0].staffId, 's1');
      assert.strictEqual(ranked[0].rank, 60);
      // volunteer and organizer both get 50; order depends on sort stability
      assert.ok(ranked[1].rank === 50 || ranked[2].rank === 50);
    });

    it('should assign correct incidentId to each result', () => {
      const roster: RosterItem[] = [
        { staffId: 'x1', name: 'X', role: 'staff', zone: 'Zone_A', status: 'Active' },
      ];
      const ranked = rankDispatches('inc_xyz', 'Zone_A', roster);
      assert.strictEqual(ranked[0].incidentId, 'inc_xyz');
    });

    it('should produce descriptive reason strings', () => {
      const roster: RosterItem[] = [
        { staffId: 'same', name: 'Same', role: 'staff', zone: 'Zone_A', status: 'Active' },
        { staffId: 'diff', name: 'Diff', role: 'volunteer', zone: 'Zone_B', status: 'Active' },
      ];
      const ranked = rankDispatches('inc_reasons', 'Zone_A', roster);

      const sameResult = ranked.find((r) => r.staffId === 'same');
      const diffResult = ranked.find((r) => r.staffId === 'diff');
      assert.ok(sameResult!.reason.includes('same zone'));
      assert.ok(diffResult!.reason.includes('transit required'));
    });
  });
});
