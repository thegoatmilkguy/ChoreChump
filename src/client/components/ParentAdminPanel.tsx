import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  Ban,
  UserPlus,
  Trash2,
  KeyRound,
  Coins,
} from 'lucide-react';
import { RewardClaim, Room, User } from '../types';

interface ParentAdminPanelProps {
  users: User[];
  rooms: Room[];
  claims: RewardClaim[];
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

const AVATAR_OPTIONS = ['🧔', '👩', '🦁', '🦊', '🐼', '🐸', '🦄', '🦖', '🚀', '🌟', '🐶', '🐱'];

export function ParentAdminPanel({
  users,
  rooms,
  claims,
  onRefresh,
  onShowToast,
}: ParentAdminPanelProps) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'kid' | 'parent'>('kid');
  const [newAvatar, setNewAvatar] = useState('🐼');
  const [newPin, setNewPin] = useState('');
  const [parentPinInput, setParentPinInput] = useState('');

  const pendingChores = rooms.flatMap((room) =>
    room.chores
      .filter((c) => c.pending_approval_by !== null)
      .map((chore) => ({
        chore,
        room,
        kid: users.find((u) => u.id === chore.pending_approval_by),
      }))
  );

  const pendingClaims = claims.filter((c) => c.status === 'pending');

  const handleApproveChore = async (choreId: number) => {
    await fetch(`/api/chores/${choreId}/approve`, { method: 'POST' });
    onShowToast('Chore approved & points awarded!');
    await onRefresh();
  };

  const handleRejectChore = async (choreId: number) => {
    await fetch(`/api/chores/${choreId}/reject`, { method: 'POST' });
    onShowToast('Chore returned to needs-cleaning');
    await onRefresh();
  };

  const handleResolveClaim = async (claimId: number, action: 'approve' | 'reject') => {
    await fetch(`/api/reward-claims/${claimId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    onShowToast(action === 'approve' ? 'Reward approved!' : 'Reward refunded');
    await onRefresh();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        role: newRole,
        avatar: newAvatar,
        pin: newPin.trim() || null,
      }),
    });
    setNewName('');
    setNewPin('');
    onShowToast(`Added ${newName} to the family!`);
    await onRefresh();
  };

  const handleAdjustPoints = async (user: User, delta: number) => {
    const nextPoints = Math.max(0, user.points_balance + delta);
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points_balance: nextPoints }),
    });
    await onRefresh();
  };

  const handleDeleteUser = async (user: User) => {
    if (users.length <= 1) return;
    if (!window.confirm(`Remove ${user.name} from family profiles?`)) return;
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleUpdateParentPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parentPinInput.trim().length < 4) {
      onShowToast('PIN must be at least 4 digits');
      return;
    }
    await fetch('/api/settings/pin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: parentPinInput.trim() }),
    });
    setParentPinInput('');
    onShowToast('Parent PIN updated!');
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Pending Approvals Queue */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-extrabold text-slate-900">
            Parent Approval Queue ({pendingChores.length + pendingClaims.length})
          </h2>
        </div>

        {pendingChores.length === 0 && pendingClaims.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing waiting for parent review right now!
          </p>
        ) : (
          <div className="space-y-3">
            {pendingChores.map(({ chore, room, kid }) => (
              <div
                key={`chore-${chore.id}`}
                className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold uppercase text-sky-700">
                    Chore Check • {room.name}
                  </span>
                  <h4 className="font-bold text-base text-slate-900">{chore.title}</h4>
                  <p className="text-xs text-slate-600">
                    Marked done by {kid?.avatar} <strong>{kid?.name}</strong> (+{chore.points} pts)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveChore(chore.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    <Check className="w-4 h-4" /> Approve (+{chore.points} pts)
                  </button>
                  <button
                    onClick={() => handleRejectChore(chore.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold"
                  >
                    <Ban className="w-4 h-4" /> Needs More Cleaning
                  </button>
                </div>
              </div>
            ))}

            {pendingClaims.map((claim) => (
              <div
                key={`claim-${claim.id}`}
                className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold uppercase text-amber-800">
                    Reward Redemption
                  </span>
                  <h4 className="font-bold text-base text-slate-900">
                    {claim.reward_icon} {claim.reward_title}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Claimed by {claim.user_avatar} <strong>{claim.user_name}</strong> ({claim.cost_points} pts)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolveClaim(claim.id, 'approve')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    <Check className="w-4 h-4" /> Approve Reward
                  </button>
                  <button
                    onClick={() => handleResolveClaim(claim.id, 'reject')}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold"
                  >
                    <Ban className="w-4 h-4" /> Refund Points
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Family Members */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">Family Profiles & Points</h3>
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{u.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{u.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {u.role}
                      </span>
                    </div>
                    <span className="text-xs text-indigo-700 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {u.points_balance} pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAdjustPoints(u, -10)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
                  >
                    -10 pts
                  </button>
                  <button
                    onClick={() => handleAdjustPoints(u, 10)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold"
                  >
                    +10 pts
                  </button>
                  {users.length > 1 && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Family Member & Parent PIN */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Add Family Member
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Sam"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'kid' | 'parent')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="kid">Kid</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="None for kids"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Choose Avatar</label>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => setNewAvatar(av)}
                    className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center border ${
                      newAvatar === av
                        ? 'bg-indigo-100 border-indigo-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
            >
              Add Profile
            </button>
          </form>

          {/* Update Parent PIN */}
          <form
            onSubmit={handleUpdateParentPin}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3"
          >
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Change Parent Mode PIN
            </h3>
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={parentPinInput}
                onChange={(e) => setParentPinInput(e.target.value)}
                placeholder="New 4-digit PIN"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Save PIN
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
