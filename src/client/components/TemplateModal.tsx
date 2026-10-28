import React, { useState } from 'react';
import { X, CheckCircle2, LayoutTemplate, Clock, Coins, Plus } from 'lucide-react';
import { RoomTemplate, User } from '../types';
import { formatDecayRate, RoomIcon } from './icons';

interface TemplateModalProps {
  templates: RoomTemplate[];
  users: User[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function TemplateModal({ templates, users, onClose, onCreated }: TemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate>(templates[0]);
  const [customRoomName, setCustomRoomName] = useState(templates[0]?.name || '');
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [initialHealth, setInitialHealth] = useState<number>(35);
  const [selectedTitles, setSelectedTitles] = useState<string[]>(
    templates[0]?.chores.map((c) => c.title) || []
  );
  const [saving, setSaving] = useState(false);

  const handleSelectTemplate = (tpl: RoomTemplate) => {
    setSelectedTemplate(tpl);
    setCustomRoomName(tpl.name);
    setSelectedTitles(tpl.chores.map((c) => c.title));
  };

  const toggleChoreTitle = (title: string) => {
    setSelectedTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await fetch('/api/rooms/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: selectedTemplate.key,
          customRoomName,
          assignedUserId,
          initialHealthPercent: initialHealth,
          selectedChoreTitles: selectedTitles,
        }),
      });
      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Built-In Room Templates</h2>
              <p className="text-xs text-slate-500">
                Pre-loaded with suggested chores and decay rates to make each room clean
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-200/70 hover:bg-slate-300/70 text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Template Picker */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              1. Choose a Room Type
            </label>
            {templates.map((tpl) => {
              const active = selectedTemplate?.key === tpl.key;
              return (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                    active
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <RoomIcon name={tpl.icon} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900">{tpl.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{tpl.description}</p>
                    <span className="inline-block mt-1 text-[11px] font-bold text-indigo-600">
                      {tpl.chores.length} suggested chores
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Customize & Add */}
          {selectedTemplate && (
            <form onSubmit={handleCreate} className="md:col-span-7 space-y-5">
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  2. Customize Room Settings
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Room Display Name (e.g., "Leo's Bedroom" or "Upstairs Bathroom")
                  </label>
                  <input
                    type="text"
                    required
                    value={customRoomName}
                    onChange={(e) => setCustomRoomName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Default Owner (Optional)
                    </label>
                    <select
                      value={assignedUserId || ''}
                      onChange={(e) =>
                        setAssignedUserId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value="">✨ Up for Grabs (Anyone)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.avatar} {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Room Condition
                    </label>
                    <select
                      value={initialHealth}
                      onChange={(e) => setInitialHealth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value={35}>Needs Cleaning Today (35% Health)</option>
                      <option value={65}>Mostly Tidy / Top-Up (65% Health)</option>
                      <option value={100}>Already 100% Clean!</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    3. Chores That Will Make {customRoomName || selectedTemplate.name} Clean (
                    {selectedTitles.length} selected)
                  </label>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedTemplate.chores.map((chore) => {
                    const checked = selectedTitles.includes(chore.title);
                    return (
                      <div
                        key={chore.title}
                        onClick={() => toggleChoreTitle(chore.title)}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                          checked
                            ? 'bg-white border-indigo-300 shadow-sm'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-1 rounded text-indigo-600 w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-slate-900">{chore.title}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                              <Coins className="w-3 h-3" /> +{chore.points} pts
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{chore.description}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Decays: {formatDecayRate(chore.decay_hours)}
                            </span>
                            <span className="uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {chore.effort_size}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || selectedTitles.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{saving ? 'Creating Room...' : `Create "${customRoomName}"`}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
