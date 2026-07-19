import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  findShortestPath,
  MERCEDES_BENZ_NODES,
  ACCESSIBLE_ADJ,
} from '../../packages/concourse-graph/src/index.ts';

describe('concourse-graph Unit Tests', () => {
  it('should find the direct optimal route on Level 100', () => {
    // Gate 1 to Restroom 101: direct edge (30s)
    const result = findShortestPath('gate_1', 'restroom_101');
    assert.ok(!result.error, `Expected a valid path but got error: ${result.error}`);
    assert.deepStrictEqual(result.path, ['gate_1', 'restroom_101']);
    assert.strictEqual(result.totalTimeSeconds, 30);
  });

  it('should calculate correct paths across zones', () => {
    // Gate 1 (Zone A) to Gate 2 (Zone B): gate_1 -> restroom_101 -> concession_burgers -> seating_101 -> elevator_north -> gate_2
    const result = findShortestPath('gate_1', 'gate_2');
    assert.ok(!result.error, `Expected a valid path but got error: ${result.error}`);
    assert.ok(result.path!.includes('gate_1'));
    assert.ok(result.path!.includes('gate_2'));
    assert.ok(result.totalTimeSeconds! > 30);
  });

  it('should adjust route weights based on zone congestion', () => {
    // Standard path Gate 1 to Restroom 101 is 30s
    const baseResult = findShortestPath('gate_1', 'restroom_101');
    assert.ok(!baseResult.error, `Expected valid base path but got error: ${baseResult.error}`);

    // With 80% congestion in Zone A, walk time should scale up
    const congestedResult = findShortestPath('gate_1', 'restroom_101', {
      zoneCongestion: { Zone_A: 0.8 },
    });
    assert.ok(
      !congestedResult.error,
      `Expected valid congested path but got error: ${congestedResult.error}`,
    );
    // avg congestion = (0.8 + 0.8) / 2 = 0.8
    // weight = 30 * (1 + 0.8 * 1.5) = 30 * 2.2 = 66
    assert.strictEqual(congestedResult.totalTimeSeconds, 66);
  });

  it('should exclude non-accessible vertical escalators and use elevators when mobilityRequired is true', () => {
    // Routing from escalator_east to concession_beers (Level 200)
    // Non-accessible path is escalator_east -> concession_beers (35s, accessible: false)
    // Accessible path is longer, via elevators

    // Without mobility requirement, the direct escalator edge is taken
    const standardResult = findShortestPath('escalator_east', 'concession_beers');
    assert.ok(
      !standardResult.error,
      `Expected valid standard path but got error: ${standardResult.error}`,
    );
    assert.deepStrictEqual(standardResult.path, ['escalator_east', 'concession_beers']);
    assert.strictEqual(standardResult.totalTimeSeconds, 35);

    // With mobility requirement, the escalator edge is excluded. It must reroute via elevators/accessible edges.
    const accessibleResult = findShortestPath('escalator_east', 'concession_beers', {
      mobilityAccessible: true,
    });
    assert.ok(
      !accessibleResult.error,
      `Expected an accessible reroute path but got error: ${accessibleResult.error}`,
    );
    assert.ok(
      !accessibleResult.path!.includes('escalator_east') ||
        accessibleResult.path!.indexOf('concession_beers') !==
          accessibleResult.path!.indexOf('escalator_east') + 1,
    );
    assert.ok(accessibleResult.totalTimeSeconds! > 100);
  });

  it('should return NO_ACCESSIBLE_PATH (never null, never silent fallback) when mobilityRequired and route uses inaccessible nodes', () => {
    // restroom_103 is marked non-accessible (no tags).
    // Edge gate_3 -> restroom_103 is accessible: false.
    // §9: The return must be { error: 'NO_ACCESSIBLE_PATH' } — never null, never a silent
    // fallback to a non-accessible route. The caller uses this to show an explicit UI message.
    const accessibleResult = findShortestPath('gate_3', 'restroom_103', {
      mobilityAccessible: true,
    });
    assert.strictEqual(
      accessibleResult.error,
      'NO_ACCESSIBLE_PATH',
      '§9 requires typed NO_ACCESSIBLE_PATH error — never null or silent fallback',
    );
    assert.ok(!accessibleResult.path, 'A NO_ACCESSIBLE_PATH result must not contain a path');
  });

  it('should return UNREACHABLE error for genuinely disconnected nodes without accessibility mode', () => {
    // Test that a non-existent target returns UNREACHABLE (not NO_ACCESSIBLE_PATH)
    const result = findShortestPath('gate_1', 'nonexistent_node_xyz');
    assert.strictEqual(
      result.error,
      'UNREACHABLE',
      'Genuinely unreachable nodes return UNREACHABLE, not NO_ACCESSIBLE_PATH',
    );
  });

  it('should return single-node path with 0 time for identity path', () => {
    const result = findShortestPath('gate_1', 'gate_1');
    assert.ok(!result.error, `Expected valid identity path but got error: ${result.error}`);
    assert.deepStrictEqual(result.path, ['gate_1']);
    assert.strictEqual(result.totalTimeSeconds, 0);
  });

  it('should use non-fast path when both mobilityAccessible and zoneCongestion are provided', () => {
    // When both options are set, the else branch fires: edges are filtered for
    // accessibility AND congestion weights are applied.
    const result = findShortestPath('gate_1', 'restroom_101', {
      mobilityAccessible: true,
      zoneCongestion: { Zone_A: 0.5 },
    });
    assert.ok(!result.error, `Expected valid path but got error: ${result.error}`);
    assert.deepStrictEqual(result.path, ['gate_1', 'restroom_101']);
    // weight = 30 * (1 + 0.5 * 1.5) = 30 * 1.75 = 52.5 → rounded to 53
    assert.strictEqual(result.totalTimeSeconds, 53);
  });

  it('should behave identically to no congestion when empty congestion object is provided', () => {
    const base = findShortestPath('gate_1', 'restroom_101');
    const emptyCongestion = findShortestPath('gate_1', 'restroom_101', { zoneCongestion: {} });
    assert.ok(!base.error);
    assert.ok(!emptyCongestion.error);
    assert.deepStrictEqual(emptyCongestion.path, base.path);
    assert.strictEqual(emptyCongestion.totalTimeSeconds, base.totalTimeSeconds);
  });

  it('should scale walk time correctly under very high congestion (density = 1.0)', () => {
    const result = findShortestPath('gate_1', 'restroom_101', {
      zoneCongestion: { Zone_A: 1.0 },
    });
    assert.ok(!result.error, `Expected valid path but got error: ${result.error}`);
    // weight = 30 * (1 + 1.0 * 1.5) = 30 * 2.5 = 75
    assert.strictEqual(result.totalTimeSeconds, 75);
  });

  it('should have adjacency entries in ACCESSIBLE_ADJ for every accessible node', () => {
    for (const node of MERCEDES_BENZ_NODES) {
      assert.ok(
        node.id in ACCESSIBLE_ADJ,
        `Accessible node "${node.id}" should have an entry in ACCESSIBLE_ADJ`,
      );
      assert.ok(
        Array.isArray(ACCESSIBLE_ADJ[node.id]),
        `ACCESSIBLE_ADJ entry for "${node.id}" should be an array`,
      );
    }
  });
});
