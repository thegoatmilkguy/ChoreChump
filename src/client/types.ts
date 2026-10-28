export type EffortSize = 'quick' | 'medium' | 'big';
export type ChoreHealthState = 'fresh' | 'top_up' | 'actionable';

export interface User {
  id: number;
  name: string;
  role: 'parent' | 'kid';
  avatar: string;
  color: string;
  pin: string | null;
  points_balance: number;
  current_streak: number;
  last_streak_date: string | null;
}

export interface Chore {
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
  rotation_user_ids: number[];
  rotation_index: number;
  requires_approval: boolean;
  last_completed_at: string;
  override_health: number | null;
  override_set_at: string | null;
  pending_approval_by: number | null;
  pending_approval_at: string | null;
  current_assignee_id: number | null;
  health: number;
  state: ChoreHealthState;
  needs_attention: boolean;
  can_complete: boolean;
  cooldown_minutes_remaining: number;
  hours_until_actionable: number;
}

export interface RoomCleanlinessSummary {
  cleanliness_percent: number;
  is_clean: boolean;
  actionable_count: number;
  top_up_count: number;
  fresh_count: number;
  total_chores: number;
  points_available_to_clean: number;
}

export interface Room {
  id: number;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  chores: Chore[];
  cleanliness: RoomCleanlinessSummary;
}

export interface TemplateChore {
  title: string;
  description: string;
  effort_size: EffortSize;
  points: number;
  decay_hours: number;
  requires_approval?: boolean;
}

export interface RoomTemplate {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  chores: TemplateChore[];
}

export interface Reward {
  id: number;
  title: string;
  description: string;
  icon: string;
  cost_points: number;
  requires_approval: number;
}

export interface RewardClaim {
  id: number;
  reward_id: number;
  reward_title: string;
  reward_icon: string;
  user_id: number;
  user_name: string;
  user_avatar: string;
  cost_points: number;
  status: 'pending' | 'approved' | 'rejected';
  claimed_at: string;
}

export interface ChoreLog {
  id: number;
  chore_id: number;
  chore_title: string;
  room_name: string;
  user_id: number;
  user_name: string;
  user_avatar: string;
  user_color: string;
  points_awarded: number;
  status: 'approved' | 'pending' | 'rejected';
  completed_at: string;
}

export interface AppState {
  users: User[];
  rooms: Room[];
  templates: RoomTemplate[];
  rewards: Reward[];
  reward_claims: RewardClaim[];
  recent_logs: ChoreLog[];
  has_parent_pin: boolean;
  server_time: string;
}
