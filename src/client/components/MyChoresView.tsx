import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import { Chore, Room, User } from '../types';
import {
  formatDecayRate,
  getHealthBadgeStyle,
  getHealthBarColor,
  RoomIcon,
} from './icons';

interface MyChoresViewProps {
  rooms: Room[];
  currentUser: User;
  onCompleteChore: (chore: Chore) => void;
  onSelectRoom: (room: Room) => void;
}

export function MyChoresView({
  rooms,
  currentUser,
  onCompleteChore,
  onSelectRoom,
}: MyChoresViewProps) {
  const allChoresWithRoom = rooms.flatMap((room) =>
    room.chores.map((chore) => ({ chore, room }))
  );

  const myActionable = allChoresWithRoom.filter(
    ({ chore }) =>
      chore.current_assignee_id === currentUser.id &&
      chore.state === 'actionable' &&
      !chore.pending_approval_by
  );

  const upForGrabsActionable = allChoresWithRoom.filter(
    ({ chore }) =>
      chore.current_assignee_id === null &&
      chore.state === 'actionable' &&
      !chore.pending_approval_by
  );

  const canTopUp = allChoresWithRoom.filter(
    ({ chore }) =>
      (chore.current_assignee_id === currentUser.id || chore.current_assignee_id === null) &&
      chore.state === 'top_up' &&
      !chore.pending_approval_by
  );

  const renderCard = ({ chore, room }: { chore: Chore; room: Room }) => (
    <div
      key={chore.id}
      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSelectRoom(room)}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 transition"
          >
            <RoomIcon name={room.icon} className="w-3.5 h-3.5" />
            <span>{room.name}</span>
          </button>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${getHealthBadgeStyle(
              chore.health
            )}`}
          >
            {Math.round(chore.health)}% Health
          </span>
          {chore.assignment_type === 'rotate' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
              <RotateCw className="w-3 h-3" /> Your Turn
            </span>
          )}
          {chore.requires_approval && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <ShieldCheck className="w-3.5 h-3.5" /> Parent Check
            </span>
          )}
        </div>

        <h4 className="text-base font-bold text-slate-900">{chore.title}</h4>
        {chore.description && <p className="text-xs text-slate-500">{chore.description}</p>}

        <div className="flex items-center gap-3 pt-1">
          <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getHealthBarColor(chore.health)}`}
              style={{ width: `${Math.max(5, chore.health)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDecayRate(chore.decay_hours)}
          </span>
        </div>
      </div>

      <button
        onClick={() => onCompleteChore(chore)}
        className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm shadow-sm transition"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Complete (+{chore.points} pts)</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* My Assigned Chores Due */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>
              {currentUser.avatar} {currentUser.name}’s Chores Needed Now ({myActionable.length})
            </span>
          </h2>
        </div>

        {myActionable.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myActionable.map(renderCard)}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-base">You’re all caught up on your assigned chores!</h3>
              <p className="text-xs text-emerald-700">
                Grab an open chore below to help make a room 100% clean and earn extra points!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Up For Grabs Chores */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span>Up for Grabs — Help Make Rooms Clean ({upForGrabsActionable.length})</span>
        </h2>

        {upForGrabsActionable.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upForGrabsActionable.map(renderCard)}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-500">
            No unassigned chores are below 50% right now.
          </div>
        )}
      </div>

      {/* Early Top-Up Eligible */}
      {canTopUp.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-lime-600" />
            <span>Early Top-Up Eligible (50%–75% Health) ({canTopUp.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canTopUp.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
