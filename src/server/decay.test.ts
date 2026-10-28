import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeChoreHealth, computeRoomCleanliness, enrichChore, RawChoreRecord } from './decay.js';

describe('ChoreChump Decay & Room Cleanliness Engine', () => {
  const baseTime = new Date('2026-10-27T12:00:00.000Z').getTime();

  it('starts at 100% health immediately after completion and enforces 25% decay cooldown', () => {
    const result = computeChoreHealth(
      {
        decay_hours: 24,
        last_completed_at: new Date(baseTime).toISOString(),
        override_health: null,
        override_set_at: null,
        pending_approval_by: null,
      },
      baseTime
    );

    assert.equal(result.health, 100);
    assert.equal(result.state, 'fresh');
    assert.equal(result.can_complete, false);
    assert.equal(result.needs_attention, false);
    assert.equal(result.cooldown_minutes_remaining, 360); // 25% of 24h = 6h = 360 mins
  });

  it('transitions to top_up state at 75% health (after 25% of decay time) and allows completion', () => {
    const sixHoursLater = baseTime + 6 * 60 * 60 * 1000;
    const result = computeChoreHealth(
      {
        decay_hours: 24,
        last_completed_at: new Date(baseTime).toISOString(),
        override_health: null,
        override_set_at: null,
        pending_approval_by: null,
      },
      sixHoursLater
    );

    assert.equal(result.health, 75);
    assert.equal(result.state, 'top_up');
    assert.equal(result.can_complete, true);
    assert.equal(result.needs_attention, false);
  });

  it('transitions to actionable state at <= 50% health and marks needs_attention', () => {
    const twelveHoursLater = baseTime + 12 * 60 * 60 * 1000;
    const result = computeChoreHealth(
      {
        decay_hours: 24,
        last_completed_at: new Date(baseTime).toISOString(),
        override_health: null,
        override_set_at: null,
        pending_approval_by: null,
      },
      twelveHoursLater
    );

    assert.equal(result.health, 50);
    assert.equal(result.state, 'actionable');
    assert.equal(result.can_complete, true);
    assert.equal(result.needs_attention, true);
  });

  it('respects parent manual override_health and decays from that value forward', () => {
    const overrideTime = baseTime + 2 * 60 * 60 * 1000;
    const fourHoursAfterOverride = overrideTime + 6 * 60 * 60 * 1000; // 25% of 24h

    const result = computeChoreHealth(
      {
        decay_hours: 24,
        last_completed_at: new Date(baseTime).toISOString(),
        override_health: 40,
        override_set_at: new Date(overrideTime).toISOString(),
        pending_approval_by: null,
      },
      fourHoursAfterOverride
    );

    assert.equal(result.health, 15); // 40% - 25% = 15%
    assert.equal(result.state, 'actionable');
    assert.equal(result.needs_attention, true);
  });

  it('computes weighted room cleanliness percentage and Clean! status accurately', () => {
    const raw1: RawChoreRecord = {
      id: 1,
      room_id: 1,
      title: 'Make Bed',
      description: '',
      effort_size: 'quick',
      weight: 1,
      points: 10,
      decay_hours: 24,
      assignment_type: 'open',
      assigned_user_id: null,
      rotation_user_ids: '[]',
      rotation_index: 0,
      requires_approval: 0,
      last_completed_at: new Date(baseTime).toISOString(), // 100% health
      override_health: null,
      override_set_at: null,
      pending_approval_by: null,
      pending_approval_at: null,
    };

    const raw2: RawChoreRecord = {
      ...raw1,
      id: 2,
      title: 'Vacuum Floor',
      effort_size: 'big',
      weight: 3,
      points: 50,
      override_health: 20, // 20% health (actionable!)
      override_set_at: new Date(baseTime).toISOString(),
    };

    const chores = [enrichChore(raw1, baseTime), enrichChore(raw2, baseTime)];
    const summary = computeRoomCleanliness(chores);

    // Weighted avg: (1 * 100 + 3 * 20) / (1 + 3) = 160 / 4 = 40%
    assert.equal(summary.cleanliness_percent, 40);
    assert.equal(summary.is_clean, false);
    assert.equal(summary.actionable_count, 1);
    assert.equal(summary.points_available_to_clean, 50);
  });
});
