import React from 'react';
import { Trophy, Flame, Coins, CheckCircle2, Clock } from 'lucide-react';
import { ChoreLog, User } from '../types';

interface LeaderboardViewProps {
  users: User[];
  logs: ChoreLog[];
}

export function LeaderboardView({ users, logs }: LeaderboardViewProps) {
  const sortedUsers = [...users].sort((a, b) => b.points_balance - a.points_balance);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Family Standings */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-extrabold text-slate-900">Family Leaderboard</h2>
        </div>

        <div className="space-y-3">
          {sortedUsers.map((user, idx) => (
            <div
              key={user.id}
              className={`p-4 rounded-3xl bg-white border-2 flex items-center justify-between gap-4 shadow-sm ${
                idx === 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-950'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-800'
                      : idx === 2
                      ? 'bg-amber-700/20 text-amber-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  #{idx + 1}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl">
                  {user.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                    <span className="text-[11px] uppercase px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 font-semibold">
                    <span className="inline-flex items-center gap-1 text-orange-600">
                      <Flame className="w-3.5 h-3.5" /> {user.current_streak} day streak
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-2xl bg-amber-100 text-amber-900 font-extrabold text-sm border border-amber-300">
                  <Coins className="w-4 h-4 text-amber-600" />
                  {user.points_balance} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Live Family Activity Feed */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-extrabold text-slate-900">Recent Room Cleaning Activity</h2>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 max-h-[520px] overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{log.user_avatar}</span>
                  <div className="min-w-0">
                    <p className="text-slate-900 font-semibold truncate">
                      <strong>{log.user_name}</strong> cleaned{' '}
                      <span className="text-indigo-700 font-bold">{log.chore_title}</span>
                    </p>
                    <p className="text-slate-500">
                      In <strong>{log.room_name}</strong> •{' '}
                      {new Date(log.completed_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {log.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> +{log.points_awarded} pts
                    </span>
                  ) : log.status === 'pending' ? (
                    <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold">
                      Pending Check
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold">
                      Returned
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No chores logged yet!</p>
          )}
        </div>
      </div>
    </div>
  );
}
