import React, { useEffect, useState, useCallback } from 'react';
import {
  Home,
  CheckSquare,
  Gift,
  Trophy,
  ShieldCheck,
  Users,
  Coins,
  Flame,
  Lock,
  Unlock,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { AppState, Chore, Room, User } from './types';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { RoomGrid } from './components/RoomGrid';
import { RoomDetailModal } from './components/RoomDetailModal';
import { TemplateModal } from './components/TemplateModal';
import { MyChoresView } from './components/MyChoresView';
import { RewardsStoreView } from './components/RewardsStoreView';
import { LeaderboardView } from './components/LeaderboardView';
import { ParentAdminPanel } from './components/ParentAdminPanel';
import { ROOM_ICONS, RoomIcon } from './components/icons';

type ActiveTab = 'rooms' | 'my-chores' | 'rewards' | 'leaderboard' | 'parent';

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem('chorechump_user_id');
    return saved ? Number(saved) : null;
  });
  const [isParentMode, setIsParentMode] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('chorechump_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('rooms');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showParentPinPrompt, setShowParentPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Custom room modal state
  const [customRoomName, setCustomRoomName] = useState('');
  const [customRoomIcon, setCustomRoomIcon] = useState('Home');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data: AppState = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch ChoreChump state:', err);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('chorechump_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    fetchState();

    // Connect to Server-Sent Events (SSE) for real-time multi-device sync
    const evSource = new EventSource('/api/events');
    evSource.onopen = () => setSseConnected(true);
    evSource.onmessage = () => {
      fetchState();
    };
    evSource.onerror = () => {
      setSseConnected(false);
    };

    // Refresh decay percentages every 60 seconds even if no events fire
    const timer = setInterval(fetchState, 60000);

    return () => {
      evSource.close();
      clearInterval(timer);
    };
  }, [fetchState]);

  const currentUser: User | null =
    state?.users.find((u) => u.id === activeUserId) || null;

  const selectedRoom: Room | null =
    state?.rooms.find((r) => r.id === selectedRoomId) || null;

  const handleSelectProfile = (user: User, parentVerified: boolean) => {
    setActiveUserId(user.id);
    localStorage.setItem('chorechump_user_id', String(user.id));
    setIsParentMode(parentVerified);
    setActiveTab('rooms');
  };

  const handleSwitchProfile = () => {
    setActiveUserId(null);
    setIsParentMode(false);
    localStorage.removeItem('chorechump_user_id');
  };

  const handleCompleteChore = async (chore: Chore, forceByParent: boolean = false) => {
    if (!currentUser) return;
    const res = await fetch(`/api/chores/${chore.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, forceByParent }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Cannot complete chore right now');
      return;
    }

    if (data.status === 'pending_approval') {
      showToast(`Marked "${chore.title}" done! Sent to Mom & Dad for approval.`);
    } else {
      showToast(`Cleaned "${chore.title}"! +${data.points_awarded} points earned!`);
    }
    await fetchState();
  };

  const handleVerifyParentPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      setIsParentMode(true);
      setShowParentPinPrompt(false);
      setPinInput('');
      showToast('Parent Mode unlocked!');
    } else {
      setPinError('Incorrect PIN (Default is 1234)');
    }
  };

  const handleCreateCustomRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomName.trim()) return;
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customRoomName,
        icon: customRoomIcon,
        color: 'indigo',
      }),
    });
    setCustomRoomName('');
    setShowNewRoomModal(false);
    await fetchState();
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-300">Loading ChoreChump...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <ProfileSwitcher users={state.users} onSelectUser={handleSelectProfile} />;
  }

  const pendingApprovalsCount =
    state.rooms.reduce(
      (sum, r) => sum + r.chores.filter((c) => c.pending_approval_by !== null).length,
      0
    ) + state.reward_claims.filter((c) => c.status === 'pending').length;

  const myDueCount = state.rooms.reduce(
    (sum, r) =>
      sum +
      r.chores.filter(
        (c) =>
          c.current_assignee_id === currentUser.id &&
          c.state === 'actionable' &&
          !c.pending_approval_by
      ).length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setActiveTab('rooms')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                C
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900">
                    Chore<span className="text-indigo-600">Chump</span>
                  </span>
                  <span
                    title={sseConnected ? 'Live sync active' : 'Reconnecting...'}
                    className={`w-2 h-2 rounded-full ${
                      sseConnected ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'rooms'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              Rooms
            </button>
            <button
              onClick={() => setActiveTab('my-chores')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'my-chores'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              My Chores
              {myDueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                  {myDueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'rewards'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className="w-4 h-4" />
              Rewards Store
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </button>
            {isParentMode && (
              <button
                onClick={() => setActiveTab('parent')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'parent'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Approvals & Family
                {pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Right User Status & Parent Mode Switch */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Parent Mode Lock/Unlock Button */}
            <button
              onClick={() => {
                if (isParentMode) {
                  setIsParentMode(false);
                  if (activeTab === 'parent') setActiveTab('rooms');
                  showToast('Exited Parent Mode');
                } else {
                  setShowParentPinPrompt(true);
                  setPinInput('');
                  setPinError('');
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 border transition ${
                isParentMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {isParentMode ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Parent Mode ON</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Parent Mode</span>
                </>
              )}
              {!isParentMode && pendingApprovalsCount > 0 && (
                <span className="ml-0.5 px-1.5 rounded-full bg-rose-500 text-white text-[10px]">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            {/* Active Profile Pill */}
            <button
              onClick={handleSwitchProfile}
              title="Click to switch family member profile"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
            >
              <span className="text-xl">{currentUser.avatar}</span>
              <div className="text-left">
                <p className="text-xs font-extrabold text-slate-900 leading-none">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-700 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <Coins className="w-3 h-3 text-amber-500" /> {currentUser.points_balance}
                  </span>
                  {currentUser.current_streak > 0 && (
                    <span className="flex items-center gap-0.5 text-orange-600">
                      <Flame className="w-3 h-3" /> {currentUser.current_streak}d
                    </span>
                  )}
                </div>
              </div>
              <Users className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'rooms' && (
          <RoomGrid
            rooms={state.rooms}
            users={state.users}
            currentUser={currentUser}
            isParentMode={isParentMode}
            onSelectRoom={(room) => setSelectedRoomId(room.id)}
            onCompleteChore={handleCompleteChore}
            onOpenTemplates={() => setShowTemplatesModal(true)}
            onOpenNewRoom={() => setShowNewRoomModal(true)}
          />
        )}

        {activeTab === 'my-chores' && (
          <MyChoresView
            rooms={state.rooms}
            currentUser={currentUser}
            onCompleteChore={handleCompleteChore}
            onSelectRoom={(room) => setSelectedRoomId(room.id)}
          />
        )}

        {activeTab === 'rewards' && (
          <RewardsStoreView
            rewards={state.rewards}
            claims={state.reward_claims}
            currentUser={currentUser}
            isParentMode={isParentMode}
            onRefresh={fetchState}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView users={state.users} logs={state.recent_logs} />
        )}

        {activeTab === 'parent' && isParentMode && (
          <ParentAdminPanel
            users={state.users}
            rooms={state.rooms}
            claims={state.reward_claims}
            onRefresh={fetchState}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'rooms' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Rooms</span>
        </button>
        <button
          onClick={() => setActiveTab('my-chores')}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'my-chores' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span>My Chores</span>
          {myDueCount > 0 && (
            <span className="absolute top-0.5 right-2 px-1.5 rounded-full bg-amber-500 text-white text-[9px]">
              {myDueCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'rewards' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span>Rewards</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            activeTab === 'leaderboard' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>Ranks</span>
        </button>
        {isParentMode && (
          <button
            onClick={() => setActiveTab('parent')}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
              activeTab === 'parent' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Parent</span>
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-0.5 right-2 px-1.5 rounded-full bg-rose-500 text-white text-[9px]">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          users={state.users}
          currentUser={currentUser}
          isParentMode={isParentMode}
          onClose={() => setSelectedRoomId(null)}
          onCompleteChore={handleCompleteChore}
          onRefresh={fetchState}
        />
      )}

      {/* Room Templates Modal */}
      {showTemplatesModal && (
        <TemplateModal
          templates={state.templates}
          users={state.users}
          onClose={() => setShowTemplatesModal(false)}
          onCreated={fetchState}
        />
      )}

      {/* Create Custom Room Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomRoom}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Create Custom Room</h3>
              <button
                type="button"
                onClick={() => setShowNewRoomModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Name</label>
              <input
                type="text"
                required
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                placeholder="e.g., Garage, Mudroom, Basement..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Choose Room Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {Object.keys(ROOM_ICONS).map((iconName) => (
                  <button
                    type="button"
                    key={iconName}
                    onClick={() => setCustomRoomIcon(iconName)}
                    className={`p-2.5 rounded-xl flex items-center justify-center border ${
                      customRoomIcon === iconName
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <RoomIcon name={iconName} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewRoomModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Parent PIN Unlock Modal */}
      {showParentPinPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleVerifyParentPin}
            className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-600" /> Unlock Parent Mode
              </h3>
              <button
                type="button"
                onClick={() => setShowParentPinPrompt(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Enter the 4-digit Parent PIN to manage rooms, override chore decay, and approve chores (default: 1234).
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.4em] font-bold py-2.5 rounded-xl border border-slate-300"
            />
            {pinError && <p className="text-xs text-rose-600 font-semibold text-center">{pinError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
            >
              Unlock Parent Controls
            </button>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
