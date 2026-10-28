import React, { useState } from 'react';
import { Lock, Sparkles, ShieldCheck, Flame, Coins, X } from 'lucide-react';
import { User } from '../types';

interface ProfileSwitcherProps {
  users: User[];
  onSelectUser: (user: User, isParentVerified: boolean) => void;
}

export function ProfileSwitcher({ users, onSelectUser }: ProfileSwitcherProps) {
  const [pinModalUser, setPinModalUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleUserClick = (user: User) => {
    if (user.role === 'parent' || user.pin) {
      setPinModalUser(user);
      setPinInput('');
      setPinError('');
    } else {
      onSelectUser(user, false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalUser) return;
    setVerifying(true);
    setPinError('');
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput, userId: pinModalUser.id }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        onSelectUser(pinModalUser, pinModalUser.role === 'parent');
        setPinModalUser(null);
      } else {
        setPinError(data.error || 'Incorrect PIN (Default is 1234)');
      }
    } catch {
      setPinError('Could not verify PIN');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Family Room & Chore Tracker</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Who’s cleaning on <span className="text-amber-400">ChoreChump</span>?
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
	  	Ok now Chump, you gotta do some chores!  Click your profile and get to work!
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="group relative flex flex-col items-center p-6 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/15 hover:border-amber-400/60 transition-all duration-200 hover:-translate-y-1 shadow-xl"
            >
              {user.role === 'parent' && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <ShieldCheck className="w-3 h-3" /> Parent
                </span>
              )}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-4xl sm:text-5xl shadow-inner group-hover:scale-105 transition-transform">
                {user.avatar}
              </div>
              <span className="mt-4 text-lg sm:text-xl font-bold tracking-wide text-white group-hover:text-amber-300">
                {user.name}
              </span>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                  <Coins className="w-3.5 h-3.5" /> {user.points_balance} pts
                </span>
                {user.current_streak > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-orange-300 font-semibold">
                    <Flame className="w-3.5 h-3.5" /> {user.current_streak}d
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {pinModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pinModalUser.avatar}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">{pinModalUser.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Enter 4-digit PIN (default: 1234)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPinModalUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[0.5em] font-bold py-3 px-4 rounded-2xl bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-amber-400"
              />
              {pinError && <p className="text-rose-400 text-xs text-center font-medium">{pinError}</p>}

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      if (key === 'Clear') setPinInput('');
                      else if (key === '⌫') setPinInput((p) => p.slice(0, -1));
                      else setPinInput((p) => (p.length < 8 ? p + key : p));
                    }}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-base active:scale-95 transition"
                  >
                    {key}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={verifying || !pinInput}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base shadow-lg disabled:opacity-50"
              >
                {verifying ? 'Checking...' : 'Unlock Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
