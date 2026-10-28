import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { ROOM_TEMPLATES } from './templates.js';
import { effortDefaults } from './decay.js';

const dataDir = process.env.CHORECHUMP_DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chorechump.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('parent', 'kid')),
      avatar TEXT NOT NULL DEFAULT '😊',
      color TEXT NOT NULL DEFAULT 'indigo',
      pin TEXT DEFAULT NULL,
      points_balance INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      last_streak_date TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Home',
      color TEXT NOT NULL DEFAULT 'indigo',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      effort_size TEXT NOT NULL DEFAULT 'quick' CHECK(effort_size IN ('quick', 'medium', 'big')),
      weight INTEGER NOT NULL DEFAULT 1,
      points INTEGER NOT NULL DEFAULT 10,
      decay_hours REAL NOT NULL DEFAULT 24,
      assignment_type TEXT NOT NULL DEFAULT 'open' CHECK(assignment_type IN ('specific', 'rotate', 'open')),
      assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rotation_user_ids TEXT NOT NULL DEFAULT '[]',
      rotation_index INTEGER NOT NULL DEFAULT 0,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      last_completed_at TEXT NOT NULL,
      override_health REAL DEFAULT NULL,
      override_set_at TEXT DEFAULT NULL,
      pending_approval_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      pending_approval_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS chore_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      chore_title TEXT NOT NULL,
      room_name TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points_awarded INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'rejected')),
      completed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '🎁',
      cost_points INTEGER NOT NULL DEFAULT 50,
      requires_approval INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS reward_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
      reward_title TEXT NOT NULL,
      reward_icon TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cost_points INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      claimed_at TEXT NOT NULL
    );
  `);

  // Ensure default parent PIN setting exists
  const pinRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('parent_pin') as
    | { value: string }
    | undefined;
  if (!pinRow) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('parent_pin', '1234');
  }

  // Seed initial starter family, rooms, chores, and rewards if no users exist yet
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    seedInitialData();
  }
}

function seedInitialData(): void {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

  const insertUser = db.prepare(`
    INSERT INTO users (name, role, avatar, color, pin, points_balance, current_streak, last_streak_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayDate = new Date(now).toISOString().slice(0, 10);
  const dadId = Number(insertUser.run('Dad', 'parent', '🧔', 'indigo', '1234', 45, 3, todayDate).lastInsertRowid);
  const momId = Number(insertUser.run('Mom', 'parent', '👩', 'purple', '1234', 60, 4, todayDate).lastInsertRowid);
  const kid1Id = Number(insertUser.run('Leo', 'kid', '🦁', 'amber', null, 120, 5, todayDate).lastInsertRowid);
  const kid2Id = Number(insertUser.run('Maya', 'kid', '🦊', 'emerald', null, 95, 3, todayDate).lastInsertRowid);

  const insertRoom = db.prepare(`
    INSERT INTO rooms (name, icon, color, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertChore = db.prepare(`
    INSERT INTO chores (
      room_id, title, description, effort_size, weight, points, decay_hours,
      assignment_type, assigned_user_id, rotation_user_ids, rotation_index,
      requires_approval, last_completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed 4 starter rooms from templates with realistic varied completion timestamps so decay is immediately visible
  const starterKeys = ['kids_bedroom', 'kitchen', 'living_room', 'bathroom'];
  starterKeys.forEach((key, roomIdx) => {
    const tpl = ROOM_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;

    const roomId = Number(insertRoom.run(tpl.name, tpl.icon, tpl.color, roomIdx).lastInsertRowid);
    tpl.chores.forEach((c, choreIdx) => {
      const { weight } = effortDefaults(c.effort_size);
      // Stagger last_completed_at so some chores need attention (<=50%), some are top-up (50-75%), and some are fresh (>75%)
      let elapsedFraction = 0.1; // fresh
      if (roomIdx === 0 && choreIdx < 2) elapsedFraction = 0.75; // actionable in Kid's Bedroom
      if (roomIdx === 1 && choreIdx === 1) elapsedFraction = 0.65; // actionable in Kitchen
      if (roomIdx === 1 && choreIdx === 2) elapsedFraction = 0.35; // top-up in Kitchen
      if (roomIdx === 2) elapsedFraction = 0.15; // Living Room is 100% Clean! badge
      if (roomIdx === 3 && choreIdx === 0) elapsedFraction = 0.85; // Bathroom towel chore actionable

      const completedAt = hoursAgo(c.decay_hours * elapsedFraction);

      let assignmentType: 'specific' | 'rotate' | 'open' = 'open';
      let assignedUserId: number | null = null;
      let rotationUserIds = '[]';

      if (key === 'kids_bedroom' && choreIdx === 0) {
        assignmentType = 'specific';
        assignedUserId = kid1Id;
      } else if (key === 'kids_bedroom' && choreIdx === 1) {
        assignmentType = 'specific';
        assignedUserId = kid2Id;
      } else if (key === 'kitchen' && choreIdx === 1) {
        assignmentType = 'rotate';
        rotationUserIds = JSON.stringify([kid1Id, kid2Id]);
      }

      insertChore.run(
        roomId,
        c.title,
        c.description,
        c.effort_size,
        weight,
        c.points,
        c.decay_hours,
        assignmentType,
        assignedUserId,
        rotationUserIds,
        0,
        c.requires_approval ? 1 : 0,
        completedAt
      );
    });
  });

  // Seed default Rewards Store items
  const insertReward = db.prepare(`
    INSERT INTO rewards (title, description, icon, cost_points, requires_approval)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertReward.run('30 Mins Extra Screen Time', 'Extra gaming, tablet, or TV time', '🎮', 50, 1);
  insertReward.run('Pick Tonight’s Dinner', 'Choose the family dinner menu or takeout spot', '🍕', 100, 1);
  insertReward.run('Stay Up 30 Mins Past Bedtime', 'Valid on Friday or Saturday night', '🌙', 75, 1);
  insertReward.run('Ice Cream Outing', 'Trip to get your favorite scoop or sundae', '🍦', 150, 1);
  insertReward.run('$5 Allowance Boost', 'Cash or savings transfer from Mom & Dad', '💵', 250, 1);

  // Seed a couple of sample activity logs
  const insertLog = db.prepare(`
    INSERT INTO chore_logs (chore_id, chore_title, room_name, user_id, points_awarded, status, completed_at)
    VALUES (?, ?, ?, ?, ?, 'approved', ?)
  `);
  insertLog.run(1, 'Make the bed', "Kid's Bedroom", kid1Id, 10, hoursAgo(4));
  insertLog.run(6, 'Clear & wipe dining table', 'Kitchen', kid2Id, 10, hoursAgo(2));
  insertLog.run(11, 'Fluff pillows & fold throw blankets', 'Living Room', momId, 10, hoursAgo(3));
  insertLog.run(12, 'Clear coffee table & clutter', 'Living Room', dadId, 15, hoursAgo(3));
}
