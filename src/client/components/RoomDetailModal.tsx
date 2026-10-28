import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Clock,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  RotateCw,
  ShieldCheck,
  Undo2,
  Check,
  Ban,
} from 'lucide-react';
import { Chore, EffortSize, Room, User } from '../types';
import {
  formatCooldown,
  formatDecayRate,
  getHealthBadgeStyle,
  getHealthBarColor,
  RoomIcon,
} from './icons';

interface RoomDetailModalProps {
  room: Room;
  users: User[];
  currentUser: User;
  isParentMode: boolean;
  onClose: () => void;
  onCompleteChore: (chore: Chore, forceByParent?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const DECAY_PRESETS = [
  { label: 'Twice Daily (12h)', hours: 12 },
  { label: 'Daily (24h)', hours: 24 },
  { label: 'Every 1.5 Days (36h)', hours: 36 },
  { label: 'Every 2 Days (48h)', hours: 48 },
  { label: 'Every 3 Days (72h)', hours: 72 },
  { label: 'Every 5 Days (120h)', hours: 120 },
  { label: 'Weekly (168h)', hours: 168 },
  { label: 'Bi-Weekly (336h)', hours: 336 },
];

export function RoomDetailModal({
  room,
  users,
  currentUser,
  isParentMode,
  onClose,
  onCompleteChore,
  onRefresh,
}: RoomDetailModalProps) {
  const [editingDecayChoreId, setEditingDecayChoreId] = useState<number | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(50);
  const [showChoreForm, setShowChoreForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  // Chore Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [effortSize, setEffortSize] = useState<EffortSize>('quick');
  const [points, setPoints] = useState(10);
  const [decayHours, setDecayHours] = useState(24);
  const [assignmentType, setAssignmentType] = useState<'open' | 'specific' | 'rotate'>('open');
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [rotationUserIds, setRotationUserIds] = useState<number[]>([]);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [initialHealth, setInitialHealth] = useState(30);

  const openAddChore = () => {
    setEditingChore(null);
    setTitle('');
    setDescription('');
    setEffortSize('quick');
    setPoints(10);
    setDecayHours(24);
    setAssignmentType('open');
    setAssignedUserId(null);
    setRotationUserIds([]);
    setRequiresApproval(false);
    setInitialHealth(30);
    setShowChoreForm(true);
  };

  const openEditChore = (chore: Chore) => {
    setEditingChore(chore);
    setTitle(chore.title);
    setDescription(chore.description);
    setEffortSize(chore.effort_size);
    setPoints(chore.points);
    setDecayHours(chore.decay_hours);
    setAssignmentType(chore.assignment_type);
    setAssignedUserId(chore.assigned_user_id);
    setRotationUserIds(chore.rotation_user_ids || []);
    setRequiresApproval(chore.requires_approval);
    setShowChoreForm(true);
  };

  const handleEffortChange = (size: EffortSize) => {
    setEffortSize(size);
    if (size === 'quick') setPoints(10);
    if (size === 'medium') setPoints(25);
    if (size === 'big') setPoints(50);
  };

  const handleSaveChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      room_id: room.id,
      title,
      description,
      effort_size: effortSize,
      points,
      decay_hours: decayHours,
      assignment_type: assignmentType,
      assigned_user_id: assignmentType === 'specific' ? assignedUserId : null,
      rotation_user_ids: assignmentType === 'rotate' ? rotationUserIds : [],
      requires_approval: requiresApproval,
      ...(editingChore ? {} : { initial_health: initialHealth }),
    };

    if (editingChore) {
      await fetch(`/api/chores/${editingChore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setShowChoreForm(false);
    await onRefresh();
  };

  const handleDeleteChore = async (choreId: number) => {
    await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm(`Delete "${room.name}" and all its chores?`)) return;
    await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
    await onRefresh();
    onClose();
  };

  const handleSetManualDecay = async (
    choreId: number,
    healthPercent: number,
    revertLastPoints: boolean = false
  ) => {
    await fetch(`/api/chores/${choreId}/decay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthPercent, revertLastPoints }),
    });
    setEditingDecayChoreId(null);
    await onRefresh();
  };

  const handleApproveChore = async (choreId: number) => {
    await fetch(`/api/chores/${choreId}/approve`, { method: 'POST' });
    await onRefresh();
  };

  const handleRejectChore = async (choreId: number) => {
    await fetch(`/api/chores/${choreId}/reject`, { method: 'POST' });
    await onRefresh();
  };

  const getUserById = (id: number | null) => users.find((u) => u.id === id);

  const actionableChores = room.chores.filter((c) => c.state === 'actionable' && !c.pending_approval_by);
  const topUpChores = room.chores.filter((c) => c.state === 'top_up' && !c.pending_approval_by);
  const freshOrPendingChores = room.chores.filter(
    (c) => c.state === 'fresh' || c.pending_approval_by !== null
  );

  const renderChoreItem = (chore: Chore) => {
    const assignee = getUserById(chore.current_assignee_id);
    const pendingUser = getUserById(chore.pending_approval_by);
    const isPending = chore.pending_approval_by !== null;
    const isDecayOpen = editingDecayChoreId === chore.id;

    return (
      <div
        key={chore.id}
        className={`p-4 rounded-2xl border transition-all space-y-3 ${
          isPending
            ? 'bg-sky-50/70 border-sky-200'
            : chore.state === 'actionable'
            ? 'bg-amber-50/60 border-amber-200'
            : chore.state === 'top_up'
            ? 'bg-lime-50/40 border-lime-200'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-base">{chore.title}</h4>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getHealthBadgeStyle(
                  chore.health,
                  isPending
                )}`}
              >
                {isPending ? 'Pending Approval' : `${Math.round(chore.health)}% Health`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                {chore.effort_size} ({chore.weight}x weight)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                +{chore.points} pts
              </span>
            </div>

            {chore.description && (
              <p className="text-xs text-slate-600">{chore.description}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap pt-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Decays: {formatDecayRate(chore.decay_hours)}
              </span>

              {assignee ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
                  <span>{assignee.avatar}</span>
                  <span>{assignee.name}</span>
                  {chore.assignment_type === 'rotate' && (
                    <span className="inline-flex items-center gap-0.5 text-indigo-600 text-[10px]">
                      <RotateCw className="w-3 h-3" /> Rotating
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                  ✨ Up for Grabs
                </span>
              )}

              {chore.requires_approval && (
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Parent Approval Required
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isPending ? (
              isParentMode ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-sky-800 font-medium mr-1">
                    Done by {pendingUser?.avatar} {pendingUser?.name}:
                  </span>
                  <button
                    onClick={() => handleApproveChore(chore.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve (+{chore.points})
                  </button>
                  <button
                    onClick={() => handleRejectChore(chore.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold"
                  >
                    <Ban className="w-3.5 h-3.5" /> Not Clean
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold">
                  Waiting for Parent Check ({pendingUser?.name})
                </span>
              )
            ) : chore.can_complete ? (
              <button
                onClick={() => onCompleteChore(chore)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {chore.state === 'top_up' ? `Top Up (+${chore.points} pts)` : `Mark Clean (+${chore.points} pts)`}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                  Fresh! Ready in {formatCooldown(chore.cooldown_minutes_remaining)}
                </span>
                {isParentMode && (
                  <button
                    onClick={() => onCompleteChore(chore, true)}
                    title="Force complete as parent"
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                  >
                    Force Reset
                  </button>
                )}
              </div>
            )}

            {isParentMode && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  onClick={() => {
                    if (isDecayOpen) {
                      setEditingDecayChoreId(null);
                    } else {
                      setEditingDecayChoreId(chore.id);
                      setSliderValue(Math.round(chore.health));
                    }
                  }}
                  title="Manually adjust chore decay level"
                  className={`p-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition ${
                    isDecayOpen
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Decay</span>
                </button>
                <button
                  onClick={() => openEditChore(chore)}
                  title="Edit chore"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteChore(chore.id)}
                  title="Delete chore"
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Health Progress Bar */}
        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getHealthBarColor(
              chore.health,
              isPending
            )}`}
            style={{ width: `${Math.max(3, isPending ? 100 : chore.health)}%` }}
          />
        </div>

        {/* Parent Manual Decay Control Drawer */}
        {isParentMode && isDecayOpen && (
          <div className="pt-2 mt-2 border-t border-slate-200/80 bg-slate-50/90 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Parent Manual Decay Override: <span className="text-indigo-600">{sliderValue}% Health</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {sliderValue <= 50
                  ? 'Needs Attention (Actionable)'
                  : sliderValue <= 75
                  ? 'Top-Up Eligible'
                  : 'Fresh (Cooldown)'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full decay-slider bg-slate-200"
              />
              <button
                onClick={() => handleSetManualDecay(chore.id, sliderValue)}
                className="shrink-0 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
              >
                Apply {sliderValue}%
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Presets:</span>
                <button
                  onClick={() => handleSetManualDecay(chore.id, 0)}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold"
                >
                  Messy (0%)
                </button>
                <button
                  onClick={() => handleSetManualDecay(chore.id, 35)}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold"
                >
                  Needs Doing (35%)
                </button>
                <button
                  onClick={() => handleSetManualDecay(chore.id, 65)}
                  className="px-2.5 py-1 rounded-lg bg-lime-100 hover:bg-lime-200 text-lime-800 text-xs font-bold"
                >
                  Top-Up (65%)
                </button>
                <button
                  onClick={() => handleSetManualDecay(chore.id, 100)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold"
                >
                  100% Fresh
                </button>
              </div>

              <button
                onClick={() => handleSetManualDecay(chore.id, 15, true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                <Undo2 className="w-3 h-3" /> Not Done! Dock Last Points & Set 15%
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                room.cleanliness.is_clean
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <RoomIcon name={room.icon} className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{room.name}</h2>
                {room.cleanliness.is_clean ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" /> Clean! ({room.cleanliness.cleanliness_percent}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> {room.cleanliness.actionable_count} Needed to Clean ({room.cleanliness.cleanliness_percent}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Weighted Room Cleanliness Meter • Chores ≤ 50% health need attention to make this room clean
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-200/70 hover:bg-slate-300/70 text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Parent Controls Bar */}
          {isParentMode && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Parent Room Controls: Add chores or click "Decay" on any chore to manually set its messiness.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={openAddChore}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Chore to {room.name}
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Room
                </button>
              </div>
            </div>
          )}

          {/* Add / Edit Chore Inline Form */}
          {showChoreForm && (
            <form
              onSubmit={handleSaveChore}
              className="p-5 rounded-2xl bg-slate-50 border-2 border-indigo-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">
                  {editingChore ? `Edit "${editingChore.title}"` : `New Chore for ${room.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowChoreForm(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chore Title (What needs to be done?)
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Make the bed, Vacuum carpet..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description / Definition of "Clean" (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Sheets pulled up, pillows arranged, nothing on floor"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Effort Size & Room Weight
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['quick', 'medium', 'big'] as EffortSize[]).map((size) => (
                      <button
                        type="button"
                        key={size}
                        onClick={() => handleEffortChange(size)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold capitalize border transition ${
                          effortSize === size
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {size} ({size === 'quick' ? '1x' : size === 'medium' ? '2x' : '3x'})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Points Reward
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Decay Rate (100% → 0% Hours)
                  </label>
                  <select
                    value={decayHours}
                    onChange={(e) => setDecayHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {DECAY_PRESETS.map((p) => (
                      <option key={p.hours} value={p.hours}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assignment Mode
                  </label>
                  <select
                    value={assignmentType}
                    onChange={(e) =>
                      setAssignmentType(e.target.value as 'open' | 'specific' | 'rotate')
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="open">Up for Grabs (Anyone)</option>
                    <option value="specific">Assigned to Specific Person</option>
                    <option value="rotate">Rotate Between Selected Family Members</option>
                  </select>
                </div>

                {assignmentType === 'specific' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Family Member
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {users.map((u) => (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => setAssignedUserId(u.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                            assignedUserId === u.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          <span>{u.avatar}</span>
                          <span>{u.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {assignmentType === 'rotate' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Family Members in Rotation
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {users.map((u) => {
                        const selected = rotationUserIds.includes(u.id);
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() =>
                              setRotationUserIds((prev) =>
                                selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                              selected
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <span>{u.avatar}</span>
                            <span>{u.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresApproval}
                      onChange={(e) => setRequiresApproval(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Requires Parent Approval before awarding points
                  </label>

                  {!editingChore && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>Starting Health:</span>
                      <select
                        value={initialHealth}
                        onChange={(e) => setInitialHealth(Number(e.target.value))}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value={20}>Needs Cleaning Now (20%)</option>
                        <option value={65}>Top-Up Eligible (65%)</option>
                        <option value={100}>Already Clean (100%)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChoreForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  {editingChore ? 'Save Chore Changes' : 'Add Chore'}
                </button>
              </div>
            </form>
          )}

          {/* Section 1: Needs Attention (<= 50%) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Needs Attention to Make Room Clean (≤ 50% Health) — {actionableChores.length}
              </h3>
            </div>
            {actionableChores.length > 0 ? (
              <div className="space-y-2.5">{actionableChores.map(renderChoreItem)}</div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                No chores in {room.name} are below 50% health! This room has earned its Clean! badge.
              </div>
            )}
          </div>

          {/* Section 2: Top-Up Eligible (50% - 75%) */}
          {topUpChores.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-lime-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-600" />
                Can Top Up Early for Full Points (50%–75% Health) — {topUpChores.length}
              </h3>
              <div className="space-y-2.5">{topUpChores.map(renderChoreItem)}</div>
            </div>
          )}

          {/* Section 3: Fresh (> 75% Health) & Pending Approval */}
          {freshOrPendingChores.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Freshly Cleaned (&gt; 75% Health / Cooldown) — {freshOrPendingChores.length}
              </h3>
              <div className="space-y-2.5">{freshOrPendingChores.map(renderChoreItem)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
