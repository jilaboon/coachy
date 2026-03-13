'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { ResponseStatus } from '@/types/database';

interface PracticeData {
  id: string;
  title: string;
  practice_date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  notes: string | null;
  status: string;
}

interface TeamData {
  id: string;
  name: string;
  theme_color_name: string;
  theme_color_hex: string;
}

interface PlayerData {
  id: string;
  full_name: string;
  jersey_number: number | null;
  phone: string | null;
}

interface InvitationData {
  player_id: string;
  response_status: ResponseStatus;
}

interface StoredPlayer {
  playerId: string;
  playerName: string;
  detailsConfirmed: boolean;
}

const RESPONSE_OPTIONS: {
  status: ResponseStatus;
  label: string;
  emoji: string;
  bgBase: string;
  bgActive: string;
  bgMuted: string;
}[] = [
  {
    status: 'yes',
    label: 'מגיע',
    emoji: '\u2705',
    bgBase: 'bg-emerald-500',
    bgActive:
      'bg-emerald-500 text-white ring-4 ring-emerald-200 shadow-xl shadow-emerald-200/50 scale-[1.02]',
    bgMuted:
      'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100',
  },
  {
    status: 'no',
    label: 'לא מגיע',
    emoji: '\u274C',
    bgBase: 'bg-red-500',
    bgActive:
      'bg-red-500 text-white ring-4 ring-red-200 shadow-xl shadow-red-200/50 scale-[1.02]',
    bgMuted:
      'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100',
  },
  {
    status: 'maybe',
    label: 'אולי',
    emoji: '\uD83E\uDD14',
    bgBase: 'bg-amber-500',
    bgActive:
      'bg-amber-500 text-white ring-4 ring-amber-200 shadow-xl shadow-amber-200/50 scale-[1.02]',
    bgMuted:
      'bg-amber-50 text-amber-700 border-2 border-amber-200 hover:bg-amber-100',
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

/** Darken a hex color by a percentage (0-1) */
function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type PageStep = 'select' | 'details' | 'respond';

export default function PublicPracticePage({
  params,
}: {
  params: Promise<{ practiceId: string }>;
}) {
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [practice, setPractice] = useState<PracticeData | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<StoredPlayer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ResponseStatus>('no_response');
  const [confirmed, setConfirmed] = useState(false);
  const [isPast, setIsPast] = useState(false);
  const [step, setStep] = useState<PageStep>('select');

  // Transition state for smooth step changes
  const [visible, setVisible] = useState(true);
  const [displayStep, setDisplayStep] = useState<PageStep>('select');

  // Detail editing fields
  const [editPhone, setEditPhone] = useState('');
  const [editJersey, setEditJersey] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Smooth step transition handler
  const transitionToStep = useCallback(
    (newStep: PageStep) => {
      if (newStep === displayStep) return;
      setVisible(false);
      setTimeout(() => {
        setStep(newStep);
        setDisplayStep(newStep);
        setTimeout(() => setVisible(true), 30);
      }, 200);
    },
    [displayStep]
  );

  // Resolve params
  useEffect(() => {
    params.then((p) => setPracticeId(p.practiceId));
  }, [params]);

  const loadData = useCallback(async (pid: string) => {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('get_practice_public', {
      p_practice_id: pid,
    });

    if (rpcError || !data) {
      setError(true);
      setLoading(false);
      return;
    }

    const result = data as {
      practice: PracticeData;
      team: TeamData;
      players: PlayerData[] | null;
      invitations: InvitationData[] | null;
    };

    setPractice(result.practice);
    setTeam(result.team);
    setPlayers(
      (result.players ?? []).sort((a, b) => {
        if (a.jersey_number === null && b.jersey_number === null)
          return a.full_name.localeCompare(b.full_name, 'he');
        if (a.jersey_number === null) return 1;
        if (b.jersey_number === null) return -1;
        return a.jersey_number - b.jersey_number;
      })
    );
    setInvitations(result.invitations ?? []);

    // Check if practice is past
    const practiceDateTime = new Date(
      `${result.practice.practice_date}T${result.practice.start_time}`
    );
    setIsPast(practiceDateTime < new Date());

    // Check localStorage for stored player
    const storageKey = `coachy_player_${result.team.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed: StoredPlayer = JSON.parse(stored);
        const playerExists = (result.players ?? []).some(
          (p) => p.id === parsed.playerId
        );
        if (playerExists) {
          setSelectedPlayer(parsed);
          // If details were already confirmed, go straight to respond
          if (parsed.detailsConfirmed) {
            setStep('respond');
            setDisplayStep('respond');
          } else {
            // Show details screen
            const playerData = (result.players ?? []).find(
              (p) => p.id === parsed.playerId
            );
            if (playerData) {
              setEditPhone(playerData.phone || '');
              setEditJersey(playerData.jersey_number?.toString() || '');
            }
            setStep('details');
            setDisplayStep('details');
          }
          // Check current response status
          const inv = (result.invitations ?? []).find(
            (i) => i.player_id === parsed.playerId
          );
          if (inv && inv.response_status !== 'no_response') {
            setCurrentStatus(inv.response_status);
            setConfirmed(true);
          }
        } else {
          localStorage.removeItem(storageKey);
          setStep('select');
          setDisplayStep('select');
        }
      } catch {
        localStorage.removeItem(storageKey);
        setStep('select');
        setDisplayStep('select');
      }
    } else {
      setStep('select');
      setDisplayStep('select');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (practiceId) {
      loadData(practiceId);
    }
  }, [practiceId, loadData]);

  const handleSelectPlayer = (player: PlayerData) => {
    if (!team) return;
    const stored: StoredPlayer = {
      playerId: player.id,
      playerName: player.full_name,
      detailsConfirmed: false,
    };
    localStorage.setItem(`coachy_player_${team.id}`, JSON.stringify(stored));
    setSelectedPlayer(stored);
    setEditPhone(player.phone || '');
    setEditJersey(player.jersey_number?.toString() || '');

    // Check if player already responded
    const inv = invitations.find((i) => i.player_id === player.id);
    if (inv && inv.response_status !== 'no_response') {
      setCurrentStatus(inv.response_status);
      setConfirmed(true);
    } else {
      setCurrentStatus('no_response');
      setConfirmed(false);
    }

    transitionToStep('details');
  };

  const handleSaveDetails = async () => {
    if (!selectedPlayer || !team) return;
    setSavingDetails(true);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('update_player_details', {
      p_player_id: selectedPlayer.playerId,
      p_phone: editPhone.trim() || null,
      p_jersey_number: editJersey ? parseInt(editJersey) : null,
    });

    setSavingDetails(false);

    if (!rpcError) {
      // Mark details as confirmed in localStorage
      const updated: StoredPlayer = { ...selectedPlayer, detailsConfirmed: true };
      localStorage.setItem(`coachy_player_${team.id}`, JSON.stringify(updated));
      setSelectedPlayer(updated);

      // Update local player data
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === selectedPlayer.playerId
            ? {
                ...p,
                phone: editPhone.trim() || null,
                jersey_number: editJersey ? parseInt(editJersey) : null,
              }
            : p
        )
      );

      transitionToStep('respond');
    }
  };

  const handleSkipDetails = () => {
    if (!selectedPlayer || !team) return;
    const updated: StoredPlayer = { ...selectedPlayer, detailsConfirmed: true };
    localStorage.setItem(`coachy_player_${team.id}`, JSON.stringify(updated));
    setSelectedPlayer(updated);
    transitionToStep('respond');
  };

  const handleClearPlayer = () => {
    if (!team) return;
    localStorage.removeItem(`coachy_player_${team.id}`);
    setSelectedPlayer(null);
    setCurrentStatus('no_response');
    setConfirmed(false);
    transitionToStep('select');
  };

  const handleResponse = async (status: ResponseStatus) => {
    if (isPast || submitting || !selectedPlayer || !practiceId) return;

    setSubmitting(true);
    setCurrentStatus(status);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('respond_to_practice', {
      p_practice_id: practiceId,
      p_player_id: selectedPlayer.playerId,
      p_status: status,
    });

    setSubmitting(false);

    if (!rpcError && data?.success) {
      setConfirmed(true);
      setInvitations((prev) => {
        const existing = prev.findIndex(
          (i) => i.player_id === selectedPlayer.playerId
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], response_status: status };
          return updated;
        }
        return [...prev, { player_id: selectedPlayer.playerId, response_status: status }];
      });
    } else if (data?.error === 'locked') {
      setIsPast(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200"
            style={{ borderTopColor: '#6366f1' }}
          />
          <p className="mt-5 text-base font-medium text-slate-400 animate-pulse">
            טוען...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !practice || !team) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-xs">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100">
            <span className="text-4xl">&#x274C;</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">האימון לא נמצא</h1>
          <p className="mt-3 text-base text-slate-500 leading-relaxed">
            ייתכן שהקישור שגוי או שהאימון נמחק
          </p>
        </div>
      </div>
    );
  }

  const teamColor = team.theme_color_hex;
  const teamColorDark = darkenColor(teamColor, 0.35);
  const formattedDate = formatDate(practice.practice_date);
  const formattedTime = formatTime(practice.start_time);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 pb-10"
      style={{ '--team-primary': teamColor } as React.CSSProperties}
    >
      {/* Gradient Header */}
      <div
        className="relative px-4 pb-16 pt-10 text-center text-white"
        style={{
          background: `linear-gradient(180deg, ${teamColorDark} 0%, ${teamColor} 100%)`,
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative">
          <p className="text-sm font-medium text-white/70 tracking-wide uppercase">
            {team.name}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            {practice.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Practice Details Card — overlaps header */}
        <div className="-mt-10 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-black/[0.04] animate-fade-in-up">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <span className="text-lg">&#x1F4C5;</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                תאריך
              </p>
              <p className="text-sm font-bold text-slate-800 leading-snug">
                {formattedDate}
              </p>
            </div>
            <div className="space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <span className="text-lg">&#x1F550;</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                שעה
              </p>
              <p className="text-sm font-bold text-slate-800">
                {formattedTime}
                {practice.end_time && ` - ${formatTime(practice.end_time)}`}
              </p>
            </div>
            <div className="space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <span className="text-lg">&#x1F4CD;</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                מיקום
              </p>
              <p className="text-sm font-bold text-slate-800 leading-snug">
                {practice.location}
              </p>
            </div>
          </div>
        </div>

        {/* Step content area with transitions */}
        <div
          className="transition-all duration-200 ease-in-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {/* STEP: Player Selection */}
          {displayStep === 'select' && (
            <div className="mt-5 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/[0.04]">
              <div className="text-center mb-5">
                <span className="text-3xl">&#x1F3C0;</span>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  מי אתה?
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  בחר את השם שלך מהרשימה
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {players.map((player, index) => {
                  const inv = invitations.find((i) => i.player_id === player.id);
                  const responded = inv && inv.response_status !== 'no_response';
                  const delayClass =
                    index < 5
                      ? `delay-${index + 1}`
                      : index < 10
                        ? 'delay-5'
                        : '';
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player)}
                      className={`animate-slide-in ${delayClass} group flex items-center gap-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3.5 text-right transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-md active:scale-[0.97] active:shadow-sm`}
                      style={
                        {
                          '--hover-border': teamColor,
                        } as React.CSSProperties
                      }
                    >
                      {/* Jersey badge */}
                      <span
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
                        style={{ backgroundColor: teamColor }}
                      >
                        {player.jersey_number !== null
                          ? player.jersey_number
                          : '\u{1F3C0}'}
                      </span>
                      <span className="flex-1 text-base font-semibold text-slate-800">
                        {player.full_name}
                      </span>
                      {responded && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs">
                          {inv.response_status === 'yes' && '\u2705'}
                          {inv.response_status === 'no' && '\u274C'}
                          {inv.response_status === 'maybe' && '\uD83E\uDD14'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Details Confirmation */}
          {displayStep === 'details' && selectedPlayer && (
            <div className="mt-5 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/[0.04]">
              <div className="text-center mb-6">
                <div
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-white text-xl font-bold shadow-md"
                  style={{ backgroundColor: teamColor }}
                >
                  &#x1F44B;
                </div>
                <p className="text-xl font-bold text-slate-900">
                  שלום {selectedPlayer.playerName}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  בדוק שהפרטים שלך נכונים
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                    מספר טלפון
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="050-1234567"
                    dir="ltr"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                    מספר חולצה
                  </label>
                  <input
                    type="number"
                    value={editJersey}
                    onChange={(e) => setEditJersey(e.target.value)}
                    placeholder="לדוגמה: 7"
                    dir="ltr"
                    min="0"
                    max="99"
                    className="input"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveDetails}
                disabled={savingDetails}
                className="btn btn-primary mt-6 w-full py-3.5 text-base"
              >
                {savingDetails ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="btn-spinner h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    שומר...
                  </span>
                ) : (
                  'אישור והמשך'
                )}
              </button>

              <button
                onClick={handleSkipDetails}
                className="mt-4 w-full text-center text-sm font-medium text-slate-400 py-2 rounded-xl transition-colors duration-200 hover:text-slate-600 hover:bg-slate-50 active:scale-[0.98]"
              >
                דלג
              </button>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={handleClearPlayer}
                  className="w-full text-center text-xs text-slate-300 transition-colors duration-200 hover:text-slate-400 active:scale-[0.98]"
                >
                  לא אתה? לחץ כאן
                </button>
              </div>
            </div>
          )}

          {/* STEP: Response */}
          {displayStep === 'respond' && selectedPlayer && (
            <div className="mt-5 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/[0.04]">
              <div className="text-center mb-6">
                <p className="text-xl font-bold text-slate-900">
                  שלום {selectedPlayer.playerName} &#x1F44B;
                </p>
                <p className="mt-2 text-lg text-slate-500">
                  {isPast ? (
                    <span className="flex items-center justify-center gap-2">
                      <span>&#x1F512;</span>
                      האימון כבר התקיים
                    </span>
                  ) : (
                    'האם תגיע לאימון?'
                  )}
                </p>
              </div>

              {/* Response Buttons — HERO */}
              <div className="flex flex-col gap-3">
                {RESPONSE_OPTIONS.map((option) => {
                  const isSelected = currentStatus === option.status && confirmed;
                  return (
                    <button
                      key={option.status}
                      onClick={() => handleResponse(option.status)}
                      disabled={isPast || submitting}
                      className={`relative flex items-center justify-center gap-3 rounded-2xl py-6 text-xl font-bold transition-all duration-200 ${
                        isPast
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400 border-2 border-slate-200 opacity-60'
                          : isSelected
                            ? option.bgActive
                            : option.bgMuted
                      } ${!isPast && !isSelected ? 'active:scale-[0.96]' : ''} ${
                        submitting ? 'pointer-events-none' : ''
                      }`}
                    >
                      <span className="text-2xl">{option.emoji}</span>
                      <span>{option.label}</span>
                      {isSelected && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-70">
                          &#x2714;
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Confirmation message */}
              {confirmed && !isPast && (
                <div
                  className="mt-6 rounded-2xl p-5 text-center animate-fade-in-up"
                  style={{ backgroundColor: `${teamColor}12` }}
                >
                  <p className="text-lg font-bold" style={{ color: teamColor }}>
                    {currentStatus === 'yes' && '\u{1F3C0} תודה! נתראה באימון'}
                    {currentStatus === 'no' && 'תודה על העדכון'}
                    {currentStatus === 'maybe' && '\u{1F64F} תודה! עדכן כשתדע'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    ניתן לשנות את התשובה עד לתחילת האימון
                  </p>
                </div>
              )}

              {isPast && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-400">
                    &#x1F512; האימון כבר התקיים - לא ניתן לשנות תשובה
                  </p>
                </div>
              )}

              {/* Switch player link */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={handleClearPlayer}
                  className="w-full text-center text-xs text-slate-300 transition-colors duration-200 hover:text-slate-400 active:scale-[0.98]"
                >
                  לא אתה? לחץ כאן
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
