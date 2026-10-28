import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Plus,
  LayoutTemplate,
  Coins,
  Clock,
  ChevronRight,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';
import { Chore, Room, User } from '../types';
import {
  formatCooldown,
  getHealthBadgeStyle,
  getHealthBarColor,
  RoomIcon,
} from './icons';

interface RoomGridProps {
  rooms: Room[];
  users: User[];
  currentUser: User;
  isParentMode: boolean;
  onSelectRoom: (room: Room) => void;
  onCompleteChore: (chore: Chore) => void;
  onOpenTemplates: () => void;
  onOpenNewRoom: () => void;
}

export function RoomGrid({
  rooms,
  users,
  currentUser,
  isParentMode,
  onSelectRoom,
  onCompleteChore,
  onOpenTemplates,
  onOpenNewRoom,
}: RoomGridProps) {
  const cleanRoomsCount = rooms.filter((r) => r.cleanliness.is_clean).length;
  const totalActionable = rooms.reduce((acc, r) => acc + r.cleanliness.actionable_count, 0);

  const getUserById = (id: number | null) => users.find((u) => u.id === id);

  return (
    <div className="space-y-6">
      {/* House Summary Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              House Cleanliness by Room
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {cleanRoomsCount} of {rooms.length} Rooms Clean!
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {totalActionable === 0
              ? 'Every room in the house is currently above the clean threshold! Great job family!'
              : `${totalActionable} chore${totalActionable === 1 ? '' : 's'} across the house need attention (≤ 50% health) to make every room clean.`}
          </p>
        </div>

        {isParentMode && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenTemplates}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
            >
              <LayoutTemplate className="w-4 h-4" />
              Add Room Template
            </button>
            <button
              onClick={onOpenNewRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Custom Room
            </button>
          </div>
        )}
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rooms.map((room) => {
          const { cleanliness } = room;
          const actionableChores = room.chores.filter(
            (c) => c.state === 'actionable' && !c.pending_approval_by
          );
          const topUpChores = room.chores.filter(
            (c) => c.state === 'top_up' && !c.pending_approval_by
          );
          const pendingChores = room.chores.filter((c) => c.pending_approval_by !== null);

          return (
            <div
              key={room.id}
              className={`rounded-3xl bg-white shadow-sm border-2 transition-all flex flex-col justify-between overflow-hidden ${
                cleanliness.is_clean
                  ? 'border-emerald-200/90 hover:border-emerald-300'
                  : 'border-amber-300/90 hover:border-amber-400'
              }`}
            >
              {/* Top Header */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => onSelectRoom(room)}
                    className="flex items-center gap-3.5 cursor-pointer group"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                        cleanliness.is_clean
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <RoomIcon name={room.icon} className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                        {room.name}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {room.chores.length} total chores •{' '}
                        {cleanliness.fresh_count} fresh, {cleanliness.top_up_count} top-up,{' '}
                        {cleanliness.actionable_count} due
                      </p>
                    </div>
                  </div>

                  {/* Clean Status Badge */}
                  {cleanliness.is_clean ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      CLEAN! ({cleanliness.cleanliness_percent}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {cleanliness.actionable_count} to Make Clean ({cleanliness.cleanliness_percent}%)
                    </span>
                  )}
                </div>

                {/* Room Cleanliness Health Meter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Room Cleanliness Meter</span>
                    <span
                      className={
                        cleanliness.is_clean ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'
                      }
                    >
                      {cleanliness.cleanliness_percent}% Health
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getHealthBarColor(
                        cleanliness.cleanliness_percent
                      )}`}
                      style={{ width: `${Math.max(4, cleanliness.cleanliness_percent)}%` }}
                    />
                  </div>
                </div>

                {/* "What Will Make This Room Clean" Section */}
                {actionableChores.length > 0 ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        What will make {room.name} clean:
                      </span>
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" /> +{cleanliness.points_available_to_clean} pts available
                      </span>
                    </div>

                    <div className="space-y-2">
                      {actionableChores.map((chore) => {
                        const assignee = getUserById(chore.current_assignee_id);
                        return (
                          <div
                            key={chore.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-50 transition"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900 truncate">
                                  {chore.title}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getHealthBadgeStyle(
                                    chore.health
                                  )}`}
                                >
                                  {Math.round(chore.health)}%
                                </span>
                                {assignee ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700">
                                    <span>{assignee.avatar}</span>
                                    <span>{assignee.name}</span>
                                    {chore.assignment_type === 'rotate' && (
                                      <RotateCw className="w-2.5 h-2.5 text-indigo-500" />
                                    )}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    Up for Grabs
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getHealthBarColor(chore.health)}`}
                                  style={{ width: `${Math.max(4, chore.health)}%` }}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => onCompleteChore(chore)}
                              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Done (+{chore.points})</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-950">
                          {room.name} is Clean!
                        </p>
                        <p className="text-xs text-emerald-700">
                          All chores are above 50% health.{' '}
                          {topUpChores.length > 0
                            ? `${topUpChores.length} chore(s) can be topped up early for points.`
                            : 'Nothing urgent needed right now!'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Parent Approval Banner inside Room Card if any */}
                {pendingChores.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 font-medium">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-sky-600" />
                      {pendingChores.length} chore(s) waiting for Parent Approval
                    </span>
                    <button
                      onClick={() => onSelectRoom(room)}
                      className="text-sky-700 font-bold underline hover:text-sky-900"
                    >
                      Review
                    </button>
                  </div>
                )}

                {/* Top-Up Eligible Chores Preview (50% - 75%) */}
                {topUpChores.length > 0 && actionableChores.length === 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Available for Early Top-Up (50%–75% health):
                    </span>
                    {topUpChores.slice(0, 2).map((chore) => (
                      <div
                        key={chore.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-slate-800 truncate">{chore.title}</span>
                          <span className="text-lime-700 font-bold">{Math.round(chore.health)}%</span>
                        </div>
                        <button
                          onClick={() => onCompleteChore(chore)}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold"
                        >
                          Top Up (+{chore.points})
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Chores decay continuously by rate
                </span>
                <button
                  onClick={() => onSelectRoom(room)}
                  className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <span>View All {room.chores.length} Chores & Decay</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
