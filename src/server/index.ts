import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { db, initDatabase } from './db.js';
import {
  computeRoomCleanliness,
  effortDefaults,
  EffortSize,
  enrichChore,
  RawChoreRecord,
} from './decay.js';
import { ROOM_TEMPLATES } from './templates.js';
import { addSseClient, broadcastEvent } from './sse.js';

initDatabase();

export const app = express();
app.use(cors());
app.use(express.json());

function updateStreakForUser(userId: number, nowDate: Date = new Date()): void {
  const user = db
    .prepare('SELECT current_streak, last_streak_date FROM users WHERE id = ?')
    .get(userId) as { current_streak: number; last_streak_date: string | null } | undefined;
  if (!user) return;

  const todayStr = nowDate.toISOString().slice(0, 10);
  if (user.last_streak_date === todayStr) {
    return;
  }

  const yesterday = new Date(nowDate.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const nextStreak = user.last_streak_date === yesterday ? user.current_streak + 1 : 1;

  db.prepare('UPDATE users SET current_streak = ?, last_streak_date = ? WHERE id = ?').run(
    nextStreak,
    todayStr,
    userId
  );
}

function getHydratedState() {
  const nowMs = Date.now();
  const users = db.prepare('SELECT * FROM users ORDER BY role DESC, id ASC').all();
  const rawRooms = db.prepare('SELECT * FROM rooms ORDER BY sort_order ASC, id ASC').all() as Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    sort_order: number;
    created_at: string;
  }>;
  const rawChores = db.prepare('SELECT * FROM chores ORDER BY id ASC').all() as RawChoreRecord[];

  const enrichedChores = rawChores.map((c) => enrichChore(c, nowMs));

  const rooms = rawRooms.map((room) => {
    const roomChores = enrichedChores
      .filter((c) => c.room_id === room.id)
      .sort((a, b) => a.health - b.health);
    const cleanliness = computeRoomCleanliness(roomChores);
    return {
      ...room,
      chores: roomChores,
      cleanliness,
    };
  });

  const rewards = db.prepare('SELECT * FROM rewards ORDER BY cost_points ASC, id ASC').all();
  const reward_claims = db
    .prepare(`
      SELECT rc.*, u.name as user_name, u.avatar as user_avatar
      FROM reward_claims rc
      JOIN users u ON u.id = rc.user_id
      ORDER BY rc.id DESC
      LIMIT 50
    `)
    .all();

  const recent_logs = db
    .prepare(`
      SELECT cl.*, u.name as user_name, u.avatar as user_avatar, u.color as user_color
      FROM chore_logs cl
      JOIN users u ON u.id = cl.user_id
      ORDER BY cl.id DESC
      LIMIT 40
    `)
    .all();

  const pinSetting = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('parent_pin') as { value: string } | undefined;

  return {
    users,
    rooms,
    templates: ROOM_TEMPLATES,
    rewards,
    reward_claims,
    recent_logs,
    has_parent_pin: Boolean(pinSetting?.value),
    server_time: new Date(nowMs).toISOString(),
  };
}

// SSE endpoint for live updates across phones/tablets
app.get('/api/events', (_req, res) => {
  addSseClient(res);
});

// Hydrated full application state
app.get('/api/state', (_req, res) => {
  res.json(getHydratedState());
});

// Verify Parent PIN
app.post('/api/auth/verify-pin', (req, res) => {
  const { pin, userId } = req.body as { pin?: string; userId?: number };
  const globalPin = (
    db.prepare('SELECT value FROM settings WHERE key = ?').get('parent_pin') as
      | { value: string }
      | undefined
  )?.value || '1234';

  if (userId) {
    const user = db.prepare('SELECT pin, role FROM users WHERE id = ?').get(userId) as
      | { pin: string | null; role: string }
      | undefined;
    if (user && user.pin && user.pin === String(pin)) {
      return res.json({ valid: true });
    }
    if (user && user.role === 'parent' && String(pin) === globalPin) {
      return res.json({ valid: true });
    }
    if (user && user.role === 'kid' && !user.pin) {
      return res.json({ valid: true });
    }
  }

  if (String(pin) === globalPin) {
    return res.json({ valid: true });
  }

  return res.status(401).json({ valid: false, error: 'Incorrect PIN' });
});

// Update Parent PIN
app.put('/api/settings/pin', (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!pin || String(pin).trim().length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  }
  const cleanPin = String(pin).trim();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('parent_pin', cleanPin);
  db.prepare("UPDATE users SET pin = ? WHERE role = 'parent'").run(cleanPin);
  broadcastEvent('settings_updated');
  res.json({ ok: true });
});

// --- USERS ---
app.post('/api/users', (req, res) => {
  const { name, role, avatar, color, pin } = req.body as {
    name: string;
    role?: 'parent' | 'kid';
    avatar?: string;
    color?: string;
    pin?: string | null;
  };
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const info = db
    .prepare(
      'INSERT INTO users (name, role, avatar, color, pin) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      name.trim(),
      role === 'parent' ? 'parent' : 'kid',
      avatar || '😊',
      color || 'indigo',
      pin || null
    );
  broadcastEvent('user_created', { id: info.lastInsertRowid });
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  const { name, role, avatar, color, pin, points_balance } = req.body as {
    name?: string;
    role?: 'parent' | 'kid';
    avatar?: string;
    color?: string;
    pin?: string | null;
    points_balance?: number;
  };
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare(`
    UPDATE users
    SET name = ?, role = ?, avatar = ?, color = ?, pin = ?, points_balance = ?
    WHERE id = ?
  `).run(
    name?.trim() || existing.name,
    role || existing.role,
    avatar || existing.avatar,
    color || existing.color,
    pin !== undefined ? pin : existing.pin,
    points_balance !== undefined ? Number(points_balance) : existing.points_balance,
    userId
  );
  broadcastEvent('user_updated', { id: userId });
  res.json({ ok: true });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  broadcastEvent('user_deleted', { id: userId });
  res.json({ ok: true });
});

// --- ROOMS ---
app.post('/api/rooms', (req, res) => {
  const { name, icon, color } = req.body as { name: string; icon?: string; color?: string };
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Room name is required' });
  }
  const maxOrder = (
    db.prepare('SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM rooms').get() as { maxOrder: number }
  ).maxOrder;
  const info = db
    .prepare('INSERT INTO rooms (name, icon, color, sort_order) VALUES (?, ?, ?, ?)')
    .run(name.trim(), icon || 'Home', color || 'indigo', maxOrder + 1);
  broadcastEvent('room_created', { id: info.lastInsertRowid });
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/rooms/from-template', (req, res) => {
  const { templateKey, customRoomName, assignedUserId, initialHealthPercent, selectedChoreTitles } = req.body as {
    templateKey: string;
    customRoomName?: string;
    assignedUserId?: number | null;
    initialHealthPercent?: number;
    selectedChoreTitles?: string[];
  };

  const tpl = ROOM_TEMPLATES.find((t) => t.key === templateKey);
  if (!tpl) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const maxOrder = (
    db.prepare('SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM rooms').get() as { maxOrder: number }
  ).maxOrder;

  const roomName = customRoomName?.trim() || tpl.name;
  const roomInfo = db
    .prepare('INSERT INTO rooms (name, icon, color, sort_order) VALUES (?, ?, ?, ?)')
    .run(roomName, tpl.icon, tpl.color, maxOrder + 1);
  const roomId = Number(roomInfo.lastInsertRowid);

  const nowIso = new Date().toISOString();
  const startHealth =
    initialHealthPercent !== undefined ? Math.max(0, Math.min(100, Number(initialHealthPercent))) : null;

  const insertChore = db.prepare(`
    INSERT INTO chores (
      room_id, title, description, effort_size, weight, points, decay_hours,
      assignment_type, assigned_user_id, requires_approval, last_completed_at,
      override_health, override_set_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const choresToCreate = Array.isArray(selectedChoreTitles)
    ? tpl.chores.filter((c) => selectedChoreTitles.includes(c.title))
    : tpl.chores;

  for (const c of choresToCreate) {
    const { weight } = effortDefaults(c.effort_size);
    insertChore.run(
      roomId,
      c.title,
      c.description,
      c.effort_size,
      weight,
      c.points,
      c.decay_hours,
      assignedUserId ? 'specific' : 'open',
      assignedUserId || null,
      c.requires_approval ? 1 : 0,
      nowIso,
      startHealth,
      startHealth !== null ? nowIso : null
    );
  }

  broadcastEvent('room_created_from_template', { id: roomId });
  res.json({ id: roomId });
});

app.put('/api/rooms/:id', (req, res) => {
  const roomId = Number(req.params.id);
  const { name, icon, color } = req.body as { name?: string; icon?: string; color?: string };
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Room not found' });
  }
  db.prepare('UPDATE rooms SET name = ?, icon = ?, color = ? WHERE id = ?').run(
    name?.trim() || existing.name,
    icon || existing.icon,
    color || existing.color,
    roomId
  );
  broadcastEvent('room_updated', { id: roomId });
  res.json({ ok: true });
});

app.delete('/api/rooms/:id', (req, res) => {
  const roomId = Number(req.params.id);
  db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
  broadcastEvent('room_deleted', { id: roomId });
  res.json({ ok: true });
});

// --- CHORES ---
app.post('/api/chores', (req, res) => {
  const {
    room_id,
    title,
    description,
    effort_size,
    points,
    decay_hours,
    assignment_type,
    assigned_user_id,
    rotation_user_ids,
    requires_approval,
    initial_health,
  } = req.body as {
    room_id: number;
    title: string;
    description?: string;
    effort_size?: EffortSize;
    points?: number;
    decay_hours?: number;
    assignment_type?: 'specific' | 'rotate' | 'open';
    assigned_user_id?: number | null;
    rotation_user_ids?: number[];
    requires_approval?: boolean;
    initial_health?: number;
  };

  if (!room_id || !title?.trim()) {
    return res.status(400).json({ error: 'room_id and title are required' });
  }

  const size: EffortSize = effort_size || 'quick';
  const defaults = effortDefaults(size);
  const finalPoints = points !== undefined ? Number(points) : defaults.defaultPoints;
  const finalDecayHours = Math.max(1, Number(decay_hours) || 24);
  const nowIso = new Date().toISOString();
  const startHealth =
    initial_health !== undefined ? Math.max(0, Math.min(100, Number(initial_health))) : null;

  const info = db
    .prepare(`
      INSERT INTO chores (
        room_id, title, description, effort_size, weight, points, decay_hours,
        assignment_type, assigned_user_id, rotation_user_ids, requires_approval,
        last_completed_at, override_health, override_set_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      Number(room_id),
      title.trim(),
      description?.trim() || '',
      size,
      defaults.weight,
      finalPoints,
      finalDecayHours,
      assignment_type || 'open',
      assigned_user_id || null,
      JSON.stringify(Array.isArray(rotation_user_ids) ? rotation_user_ids : []),
      requires_approval ? 1 : 0,
      nowIso,
      startHealth,
      startHealth !== null ? nowIso : null
    );

  broadcastEvent('chore_created', { id: info.lastInsertRowid, room_id });
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/chores/:id', (req, res) => {
  const choreId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId) as RawChoreRecord | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Chore not found' });
  }

  const {
    title,
    description,
    effort_size,
    points,
    decay_hours,
    assignment_type,
    assigned_user_id,
    rotation_user_ids,
    requires_approval,
  } = req.body as {
    title?: string;
    description?: string;
    effort_size?: EffortSize;
    points?: number;
    decay_hours?: number;
    assignment_type?: 'specific' | 'rotate' | 'open';
    assigned_user_id?: number | null;
    rotation_user_ids?: number[];
    requires_approval?: boolean;
  };

  const size: EffortSize = effort_size || existing.effort_size;
  const { weight } = effortDefaults(size);

  db.prepare(`
    UPDATE chores
    SET title = ?, description = ?, effort_size = ?, weight = ?, points = ?,
        decay_hours = ?, assignment_type = ?, assigned_user_id = ?,
        rotation_user_ids = ?, requires_approval = ?
    WHERE id = ?
  `).run(
    title?.trim() || existing.title,
    description !== undefined ? description.trim() : existing.description,
    size,
    weight,
    points !== undefined ? Number(points) : existing.points,
    decay_hours !== undefined ? Math.max(1, Number(decay_hours)) : existing.decay_hours,
    assignment_type || existing.assignment_type,
    assigned_user_id !== undefined ? assigned_user_id : existing.assigned_user_id,
    rotation_user_ids !== undefined ? JSON.stringify(rotation_user_ids) : existing.rotation_user_ids,
    requires_approval !== undefined ? (requires_approval ? 1 : 0) : existing.requires_approval,
    choreId
  );

  broadcastEvent('chore_updated', { id: choreId });
  res.json({ ok: true });
});

app.delete('/api/chores/:id', (req, res) => {
  const choreId = Number(req.params.id);
  db.prepare('DELETE FROM chores WHERE id = ?').run(choreId);
  broadcastEvent('chore_deleted', { id: choreId });
  res.json({ ok: true });
});

// Complete a chore
app.post('/api/chores/:id/complete', (req, res) => {
  const choreId = Number(req.params.id);
  const { userId, forceByParent } = req.body as { userId: number; forceByParent?: boolean };

  const rawChore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId) as RawChoreRecord | undefined;
  if (!rawChore) {
    return res.status(404).json({ error: 'Chore not found' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(userId)) as
    | { id: number; name: string; role: 'parent' | 'kid'; points_balance: number }
    | undefined;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const room = db.prepare('SELECT name FROM rooms WHERE id = ?').get(rawChore.room_id) as
    | { name: string }
    | undefined;

  const enriched = enrichChore(rawChore);

  if (!enriched.can_complete && !forceByParent && user.role !== 'parent') {
    return res.status(400).json({
      error: `This chore is still fresh (${enriched.health}%). Available to complete in ${enriched.cooldown_minutes_remaining} min.`,
    });
  }

  const nowIso = new Date().toISOString();

  // Check if parent approval is required
  if (enriched.requires_approval && user.role === 'kid' && !forceByParent) {
    db.prepare(`
      UPDATE chores
      SET pending_approval_by = ?, pending_approval_at = ?
      WHERE id = ?
    `).run(user.id, nowIso, choreId);

    db.prepare(`
      INSERT INTO chore_logs (chore_id, chore_title, room_name, user_id, points_awarded, status, completed_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(choreId, rawChore.title, room?.name || 'Room', user.id, rawChore.points, nowIso);

    broadcastEvent('chore_pending_approval', { choreId, userId: user.id });
    return res.json({ status: 'pending_approval', points_awarded: 0 });
  }

  // Instant completion!
  const nextRotationIndex =
    rawChore.assignment_type === 'rotate' ? rawChore.rotation_index + 1 : rawChore.rotation_index;

  db.prepare(`
    UPDATE chores
    SET last_completed_at = ?,
        override_health = NULL,
        override_set_at = NULL,
        pending_approval_by = NULL,
        pending_approval_at = NULL,
        rotation_index = ?
    WHERE id = ?
  `).run(nowIso, nextRotationIndex, choreId);

  db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(
    rawChore.points,
    user.id
  );
  updateStreakForUser(user.id);

  db.prepare(`
    INSERT INTO chore_logs (chore_id, chore_title, room_name, user_id, points_awarded, status, completed_at)
    VALUES (?, ?, ?, ?, ?, 'approved', ?)
  `).run(choreId, rawChore.title, room?.name || 'Room', user.id, rawChore.points, nowIso);

  broadcastEvent('chore_completed', {
    choreId,
    userId: user.id,
    points_awarded: rawChore.points,
  });

  res.json({ status: 'approved', points_awarded: rawChore.points });
});

// Parent approves a pending chore completion
app.post('/api/chores/:id/approve', (req, res) => {
  const choreId = Number(req.params.id);
  const rawChore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId) as RawChoreRecord | undefined;
  if (!rawChore || !rawChore.pending_approval_by) {
    return res.status(400).json({ error: 'No pending completion for this chore' });
  }

  const kidId = rawChore.pending_approval_by;
  const nowIso = new Date().toISOString();
  const nextRotationIndex =
    rawChore.assignment_type === 'rotate' ? rawChore.rotation_index + 1 : rawChore.rotation_index;

  db.prepare(`
    UPDATE chores
    SET last_completed_at = ?,
        override_health = NULL,
        override_set_at = NULL,
        pending_approval_by = NULL,
        pending_approval_at = NULL,
        rotation_index = ?
    WHERE id = ?
  `).run(nowIso, nextRotationIndex, choreId);

  db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(
    rawChore.points,
    kidId
  );
  updateStreakForUser(kidId);

  db.prepare(`
    UPDATE chore_logs
    SET status = 'approved'
    WHERE chore_id = ? AND user_id = ? AND status = 'pending'
  `).run(choreId, kidId);

  broadcastEvent('chore_approved', { choreId, userId: kidId, points_awarded: rawChore.points });
  res.json({ ok: true });
});

// Parent rejects a pending chore completion
app.post('/api/chores/:id/reject', (req, res) => {
  const choreId = Number(req.params.id);
  const rawChore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId) as RawChoreRecord | undefined;
  if (!rawChore || !rawChore.pending_approval_by) {
    return res.status(400).json({ error: 'No pending completion for this chore' });
  }

  const kidId = rawChore.pending_approval_by;
  db.prepare(`
    UPDATE chores
    SET pending_approval_by = NULL,
        pending_approval_at = NULL
    WHERE id = ?
  `).run(choreId);

  db.prepare(`
    UPDATE chore_logs
    SET status = 'rejected'
    WHERE chore_id = ? AND user_id = ? AND status = 'pending'
  `).run(choreId, kidId);

  broadcastEvent('chore_rejected', { choreId, userId: kidId });
  res.json({ ok: true });
});

// Parent manually sets decay / health level for a chore (0% to 100%)
app.post('/api/chores/:id/decay', (req, res) => {
  const choreId = Number(req.params.id);
  const { healthPercent, revertLastPoints } = req.body as {
    healthPercent: number;
    revertLastPoints?: boolean;
  };

  const rawChore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId) as RawChoreRecord | undefined;
  if (!rawChore) {
    return res.status(404).json({ error: 'Chore not found' });
  }

  const clampedHealth = Math.max(0, Math.min(100, Number(healthPercent)));
  const nowIso = new Date().toISOString();

  db.prepare(`
    UPDATE chores
    SET override_health = ?,
        override_set_at = ?,
        pending_approval_by = NULL,
        pending_approval_at = NULL
    WHERE id = ?
  `).run(clampedHealth, nowIso, choreId);

  if (revertLastPoints) {
    const lastLog = db
      .prepare(
        `SELECT id, user_id, points_awarded FROM chore_logs WHERE chore_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 1`
      )
      .get(choreId) as { id: number; user_id: number; points_awarded: number } | undefined;
    if (lastLog) {
      db.prepare('UPDATE users SET points_balance = MAX(0, points_balance - ?) WHERE id = ?').run(
        lastLog.points_awarded,
        lastLog.user_id
      );
      db.prepare("UPDATE chore_logs SET status = 'rejected' WHERE id = ?").run(lastLog.id);
    }
  }

  broadcastEvent('chore_decay_overridden', { choreId, healthPercent: clampedHealth });
  res.json({ ok: true, health: clampedHealth });
});

// --- REWARDS STORE ---
app.post('/api/rewards', (req, res) => {
  const { title, description, icon, cost_points, requires_approval } = req.body as {
    title: string;
    description?: string;
    icon?: string;
    cost_points: number;
    requires_approval?: boolean;
  };
  if (!title?.trim()) {
    return res.status(400).json({ error: 'Reward title is required' });
  }

  const info = db
    .prepare(
      'INSERT INTO rewards (title, description, icon, cost_points, requires_approval) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      title.trim(),
      description?.trim() || '',
      icon || '🎁',
      Math.max(1, Number(cost_points) || 50),
      requires_approval === false ? 0 : 1
    );
  broadcastEvent('reward_created', { id: info.lastInsertRowid });
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/rewards/:id', (req, res) => {
  const rewardId = Number(req.params.id);
  db.prepare('DELETE FROM rewards WHERE id = ?').run(rewardId);
  broadcastEvent('reward_deleted', { id: rewardId });
  res.json({ ok: true });
});

app.post('/api/rewards/:id/claim', (req, res) => {
  const rewardId = Number(req.params.id);
  const { userId } = req.body as { userId: number };

  const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(rewardId) as
    | { id: number; title: string; icon: string; cost_points: number; requires_approval: number }
    | undefined;
  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(userId)) as
    | { id: number; points_balance: number; role: string }
    | undefined;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.points_balance < reward.cost_points) {
    return res.status(400).json({ error: 'Not enough points to claim this reward' });
  }

  const status = reward.requires_approval && user.role === 'kid' ? 'pending' : 'approved';
  const nowIso = new Date().toISOString();

  db.prepare('UPDATE users SET points_balance = points_balance - ? WHERE id = ?').run(
    reward.cost_points,
    user.id
  );

  const info = db
    .prepare(`
      INSERT INTO reward_claims (reward_id, reward_title, reward_icon, user_id, cost_points, status, claimed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(reward.id, reward.title, reward.icon, user.id, reward.cost_points, status, nowIso);

  broadcastEvent('reward_claimed', { claimId: info.lastInsertRowid, userId: user.id, status });
  res.json({ id: info.lastInsertRowid, status });
});

app.post('/api/reward-claims/:id/resolve', (req, res) => {
  const claimId = Number(req.params.id);
  const { action } = req.body as { action: 'approve' | 'reject' };

  const claim = db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(claimId) as
    | { id: number; user_id: number; cost_points: number; status: string }
    | undefined;
  if (!claim || claim.status !== 'pending') {
    return res.status(400).json({ error: 'Pending claim not found' });
  }

  if (action === 'approve') {
    db.prepare("UPDATE reward_claims SET status = 'approved' WHERE id = ?").run(claimId);
  } else {
    db.prepare("UPDATE reward_claims SET status = 'rejected' WHERE id = ?").run(claimId);
    db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(
      claim.cost_points,
      claim.user_id
    );
  }

  broadcastEvent('reward_claim_resolved', { claimId, action });
  res.json({ ok: true });
});

// Serve built static frontend in production
const clientDistPath = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChoreChump server listening on http://0.0.0.0:${PORT}`);
  });
}
