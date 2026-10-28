import React from 'react';
import {
  Bed,
  Utensils,
  Sofa,
  Bath,
  Gamepad2,
  Sparkles,
  Trees,
  Home,
  Shirt,
  Car,
  BookOpen,
  Dog,
} from 'lucide-react';

export const ROOM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Bed,
  Utensils,
  Sofa,
  Bath,
  Gamepad2,
  Sparkles,
  Trees,
  Home,
  Shirt,
  Car,
  BookOpen,
  Dog,
};

export function RoomIcon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  const IconComp = ROOM_ICONS[name] || Home;
  return <IconComp className={className} />;
}

export function formatDecayRate(hours: number): string {
  if (hours === 12) return 'Twice daily (12h)';
  if (hours === 24) return 'Daily (24h)';
  if (hours === 36) return 'Every 1.5 days (36h)';
  if (hours === 48) return 'Every 2 days (48h)';
  if (hours === 72) return 'Every 3 days (72h)';
  if (hours === 120) return 'Every 5 days (120h)';
  if (hours === 168) return 'Weekly (7 days)';
  if (hours === 336) return 'Bi-weekly (14 days)';
  if (hours % 24 === 0) return `Every ${hours / 24} days`;
  return `Every ${hours}h`;
}

export function getHealthBarColor(health: number, isPending?: boolean): string {
  if (isPending) return 'bg-sky-500';
  if (health > 75) return 'bg-emerald-500';
  if (health > 50) return 'bg-lime-500';
  if (health > 25) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function getHealthBadgeStyle(health: number, isPending?: boolean): string {
  if (isPending) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (health > 75) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (health > 50) return 'bg-lime-100 text-lime-800 border-lime-200';
  if (health > 25) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-rose-100 text-rose-800 border-rose-200';
}

export function formatCooldown(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
