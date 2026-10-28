import React, { useState } from 'react';
import { Gift, Coins, Plus, Trash2, Check, Ban, Sparkles } from 'lucide-react';
import { Reward, RewardClaim, User } from '../types';

interface RewardsStoreViewProps {
  rewards: Reward[];
  claims: RewardClaim[];
  currentUser: User;
  isParentMode: boolean;
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

const REWARD_ICONS = ['🎮', '🍕', '🍦', '🌙', '💵', '🎬', '🧸', '🛹', '🎨', '🎟️'];

export function RewardsStoreView({
  rewards,
  claims,
  currentUser,
  isParentMode,
  onRefresh,
  onShowToast,
}: RewardsStoreViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎮');
  const [costPoints, setCostPoints] = useState(50);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        icon,
        cost_points: costPoints,
        requires_approval: true,
      }),
    });
    setTitle('');
    setDescription('');
    setShowAdd(false);
    await onRefresh();
  };

  const handleDeleteReward = async (id: number) => {
    await fetch(`/api/rewards/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleClaim = async (reward: Reward) => {
    const res = await fetch(`/api/rewards/${reward.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    const data = await res.json();
    if (res.ok) {
      onShowToast(
        data.status === 'pending'
          ? `Claimed "${reward.title}"! Sent to Mom & Dad for approval.`
          : `Redeemed "${reward.title}"!`
      );
      await onRefresh();
    } else {
      onShowToast(data.error || 'Could not claim reward');
    }
  };

  const handleResolveClaim = async (claimId: number, action: 'approve' | 'reject') => {
    await fetch(`/api/reward-claims/${claimId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>ChoreChump Rewards Store</span>
          </div>
          <h2 className="text-2xl font-extrabold">Spend Your Clean Room Points!</h2>
          <p className="text-indigo-100 text-sm">
            Complete chores to make rooms clean, earn points, and trade them in for rewards.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/15 backdrop-blur-sm px-5 py-3.5 rounded-2xl border border-white/20 shrink-0">
          <span className="text-3xl">{currentUser.avatar}</span>
          <div>
            <p className="text-xs text-indigo-100 font-medium">{currentUser.name}’s Balance</p>
            <p className="text-2xl font-extrabold text-amber-300 flex items-center gap-1.5">
              <Coins className="w-5 h-5" /> {currentUser.points_balance} pts
            </p>
          </div>
        </div>
      </div>

      {/* Parent Add Reward Button / Form */}
      {isParentMode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Parent Store Controls</h3>
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {showAdd ? 'Close Form' : 'Add New Reward'}
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={handleCreateReward}
              className="p-5 rounded-3xl bg-white border-2 border-indigo-200 shadow-sm space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reward Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., 30 Mins Extra Screen Time"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Point Cost</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={costPoints}
                    onChange={(e) => setCostPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {REWARD_ICONS.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setIcon(ic)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg border ${
                          icon === ic
                            ? 'bg-indigo-100 border-indigo-500'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Save Reward
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rewards.map((reward) => {
          const canAfford = currentUser.points_balance >= reward.cost_points;
          return (
            <div
              key={reward.id}
              className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:border-indigo-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl shadow-inner">
                    {reward.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      {reward.cost_points} pts
                    </span>
                    {isParentMode && (
                      <button
                        onClick={() => handleDeleteReward(reward.id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-base text-slate-900">{reward.title}</h4>
                  {reward.description && (
                    <p className="text-xs text-slate-500 mt-1">{reward.description}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleClaim(reward)}
                disabled={!canAfford}
                className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  canAfford
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>
                  {canAfford
                    ? `Redeem for ${reward.cost_points} pts`
                    : `Need ${reward.cost_points - currentUser.points_balance} more pts`}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent Reward Redemptions */}
      {claims.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-extrabold text-slate-900">Recent Reward Redemptions</h3>
          <div className="space-y-2">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{claim.reward_icon}</span>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{claim.reward_title}</span>
                    <p className="text-slate-500">
                      Claimed by {claim.user_avatar} <strong>{claim.user_name}</strong> for{' '}
                      {claim.cost_points} pts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {claim.status === 'pending' && isParentMode ? (
                    <>
                      <button
                        onClick={() => handleResolveClaim(claim.id, 'approve')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold"
                      >
                        <Check className="w-3.5 h-3.5" /> Fulfill
                      </button>
                      <button
                        onClick={() => handleResolveClaim(claim.id, 'reject')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold"
                      >
                        <Ban className="w-3.5 h-3.5" /> Refund
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold capitalize ${
                        claim.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claim.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {claim.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
