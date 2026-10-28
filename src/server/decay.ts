export type EffortSize = 'quick' | 'medium' | 'big';
export type ChoreHealthState = 'fresh' | 'top_up' | 'actionable';

export interface RawChoreRecord {
  id: number;
  room_id: number;
  title: string;
  description: string;
  effort_size: EffortSize;
  weight: number;
  points: number;
  decay_hours: number;
  assignment_type: 'specific' | 'rotate' | 'open';
  assigned_user_id: number | null;
  rotation_user_ids: string; // JSON array of numbers
  rotation_index: number;
  requires_approval: number;
  last_completed_at: string;
  override_health: number | null;
  override_set_at: string | null;
  pending_approval_by: number | null;
  pending_approval_at: string | null;
}

export interface ComputedChore extends Omit<RawChoreRecord, 'rotation_user_ids' | 'requires_approval'> {
  rotation_user_ids: number[];
  requires_approval: boolean;
  current_assignee_id: number | null;
  health: number; // 0 to 100 (rounded to 1 decimal place)
  state: ChoreHealthState;
  needs_attention: boolean; // true when health <= 50
  can_complete: boolean; // true when health <= 75 and not pending approval
  cooldown_minutes_remaining: number;
  hours_until_actionable: number;
}

export interface RoomCleanlinessSummary {
  cleanliness_percent: number; // 0 to 100 integer
  is_clean: boolean; // true when actionable_count === 0
  actionable_count: number;
  top_up_count: number;
  fresh_count: number;
  total_chores: number;
  points_available_to_clean: number; // sum of points for actionable chores
}

export const ACTIONABLE_THRESHOLD = 50; // <= 50% needs attention / drops room Clean! badge
export const COMPLETABLE_THRESHOLD = 75; // <= 75% (25% decay elapsed) can be completed for full points

export function effortDefaults(size: EffortSize): { weight: number; defaultPoints: number } {
  switch (size) {
    case 'quick':
      return { weight: 1, defaultPoints: 10 };
    case 'medium':
      return { weight: 2, defaultPoints: 25 };
    case 'big':
      return { weight: 3, defaultPoints: 50 };
  }
}

export function computeChoreHealth(
  chore: Pick<
    RawChoreRecord,
    'decay_hours' | 'last_completed_at' | 'override_health' | 'override_set_at' | 'pending_approval_by'
  >,
  nowMs: number = Date.now()
): {
  health: number;
  state: ChoreHealthState;
  needs_attention: boolean;
  can_complete: boolean;
  cooldown_minutes_remaining: number;
  hours_until_actionable: number;
} {
  const decayHours = Math.max(0.1, chore.decay_hours || 24);
  const lastCompletedMs = chore.last_completed_at ? new Date(chore.last_completed_at).getTime() : 0;
  const overrideSetMs =
    chore.override_set_at && chore.override_health !== null && chore.override_health !== undefined
      ? new Date(chore.override_set_at).getTime()
      : 0;

  let startHealth = 100;
  let referenceMs = lastCompletedMs;

  if (overrideSetMs >= lastCompletedMs && chore.override_health !== null && chore.override_health !== undefined) {
    startHealth = Math.max(0, Math.min(100, chore.override_health));
    referenceMs = overrideSetMs;
  }

  const elapsedHours = Math.max(0, (nowMs - referenceMs) / (1000 * 60 * 60));
  const decayAmount = (elapsedHours / decayHours) * 100;
  const rawHealth = Math.max(0, Math.min(100, startHealth - decayAmount));
  const health = Math.round(rawHealth * 10) / 10;

  let state: ChoreHealthState = 'fresh';
  if (health <= ACTIONABLE_THRESHOLD) {
    state = 'actionable';
  } else if (health <= COMPLETABLE_THRESHOLD) {
    state = 'top_up';
  }

  const needs_attention = health <= ACTIONABLE_THRESHOLD;
  const isPending = chore.pending_approval_by !== null && chore.pending_approval_by !== undefined;
  const can_complete = health <= COMPLETABLE_THRESHOLD && !isPending;

  let cooldown_minutes_remaining = 0;
  if (health > COMPLETABLE_THRESHOLD) {
    const percentAboveCompletable = health - COMPLETABLE_THRESHOLD;
    const hoursRemaining = (percentAboveCompletable / 100) * decayHours;
    cooldown_minutes_remaining = Math.max(1, Math.ceil(hoursRemaining * 60));
  }

  let hours_until_actionable = 0;
  if (health > ACTIONABLE_THRESHOLD) {
    const percentAboveActionable = health - ACTIONABLE_THRESHOLD;
    hours_until_actionable = Math.round(((percentAboveActionable / 100) * decayHours) * 10) / 10;
  }

  return {
    health,
    state,
    needs_attention,
    can_complete,
    cooldown_minutes_remaining,
    hours_until_actionable,
  };
}

export function enrichChore(raw: RawChoreRecord, nowMs: number = Date.now()): ComputedChore {
  let rotationIds: number[] = [];
  try {
    rotationIds = JSON.parse(raw.rotation_user_ids || '[]');
    if (!Array.isArray(rotationIds)) rotationIds = [];
  } catch {
    rotationIds = [];
  }

  let current_assignee_id: number | null = null;
  if (raw.assignment_type === 'specific') {
    current_assignee_id = raw.assigned_user_id;
  } else if (raw.assignment_type === 'rotate' && rotationIds.length > 0) {
    const idx = ((raw.rotation_index % rotationIds.length) + rotationIds.length) % rotationIds.length;
    current_assignee_id = rotationIds[idx];
  }

  const metrics = computeChoreHealth(raw, nowMs);

  return {
    ...raw,
    rotation_user_ids: rotationIds,
    requires_approval: Boolean(raw.requires_approval),
    current_assignee_id,
    ...metrics,
  };
}

export function computeRoomCleanliness(chores: ComputedChore[]): RoomCleanlinessSummary {
  if (chores.length === 0) {
    return {
      cleanliness_percent: 100,
      is_clean: true,
      actionable_count: 0,
      top_up_count: 0,
      fresh_count: 0,
      total_chores: 0,
      points_available_to_clean: 0,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let actionable_count = 0;
  let top_up_count = 0;
  let fresh_count = 0;
  let points_available_to_clean = 0;

  for (const chore of chores) {
    const w = Math.max(1, chore.weight || 1);
    // If a chore is pending parent approval, treat its displayed room contribution as 100% tentatively
    const effectiveHealth = chore.pending_approval_by !== null ? 100 : chore.health;
    weightedSum += w * effectiveHealth;
    totalWeight += w;

    if (chore.pending_approval_by !== null) {
      fresh_count += 1;
    } else if (chore.state === 'actionable') {
      actionable_count += 1;
      points_available_to_clean += chore.points;
    } else if (chore.state === 'top_up') {
      top_up_count += 1;
    } else {
      fresh_count += 1;
    }
  }

  const cleanliness_percent = Math.round(weightedSum / totalWeight);
  const is_clean = actionable_count === 0;

  return {
    cleanliness_percent,
    is_clean,
    actionable_count,
    top_up_count,
    fresh_count,
    total_chores: chores.length,
    points_available_to_clean,
  };
}
