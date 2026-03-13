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

const RESPONSE_OPTIONS: { status: ResponseStatus; label: string; emoji: string; bg: string; activeBg: string }[] = [
  {
    status: 'yes',
    label: 'מגיע',
    emoji: '✅',
    bg: 'bg-green-50 text-green-700 border-green-200',
    activeBg: 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-200',
  },
  {
    status: 'no',
    label: 'לא מגיע',
    emoji: '❌',
    bg: 'bg-red-50 text-red-700 border-red-200',
    activeBg: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200',
  },
  {
    status: 'maybe',
    label: 'אולי',
    emoji: '🤔',
    bg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    activeBg: 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-200',
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

  // Detail editing fields
  const [editPhone, setEditPhone] = useState('');
  const [editJersey, setEditJersey] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

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
        if (a.jersey_number === null && b.jersey_number === null) return a.full_name.localeCompare(b.full_name, 'he');
        if (a.jersey_number === null) return 1;
        if (b.jersey_number === null) return -1;
        return a.jersey_number - b.jersey_number;
      })
    );
    setInvitations(result.invitations ?? []);

    // Check if practice is past
    const practiceDateTime = new Date(`${result.practice.practice_date}T${result.practice.start_time}`);
    setIsPast(practiceDateTime < new Date());

    // Check localStorage for stored player
    const storageKey = `coachy_player_${result.team.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed: StoredPlayer = JSON.parse(stored);
        const playerExists = (result.players ?? []).some((p) => p.id === parsed.playerId);
        if (playerExists) {
          setSelectedPlayer(parsed);
          // If details were already confirmed, go straight to respond
          if (parsed.detailsConfirmed) {
            setStep('respond');
          } else {
            // Show details screen
            const playerData = (result.players ?? []).find((p) => p.id === parsed.playerId);
            if (playerData) {
              setEditPhone(playerData.phone || '');
              setEditJersey(playerData.jersey_number?.toString() || '');
            }
            setStep('details');
          }
          // Check current response status
          const inv = (result.invitations ?? []).find((i) => i.player_id === parsed.playerId);
          if (inv && inv.response_status !== 'no_response') {
            setCurrentStatus(inv.response_status);
            setConfirmed(true);
          }
        } else {
          localStorage.removeItem(storageKey);
          setStep('select');
        }
      } catch {
        localStorage.removeItem(storageKey);
        setStep('select');
      }
    } else {
      setStep('select');
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
    const stored: StoredPlayer = { playerId: player.id, playerName: player.full_name, detailsConfirmed: false };
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

    setStep('details');
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
            ? { ...p, phone: editPhone.trim() || null, jersey_number: editJersey ? parseInt(editJersey) : null }
            : p
        )
      );

      setStep('respond');
    }
  };

  const handleSkipDetails = () => {
    if (!selectedPlayer || !team) return;
    const updated: StoredPlayer = { ...selectedPlayer, detailsConfirmed: true };
    localStorage.setItem(`coachy_player_${team.id}`, JSON.stringify(updated));
    setSelectedPlayer(updated);
    setStep('respond');
  };

  const handleClearPlayer = () => {
    if (!team) return;
    localStorage.removeItem(`coachy_player_${team.id}`);
    setSelectedPlayer(null);
    setCurrentStatus('no_response');
    setConfirmed(false);
    setStep('select');
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
        const existing = prev.findIndex((i) => i.player_id === selectedPlayer.playerId);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
          <p className="mt-4 text-gray-500">טוען...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !practice || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">האימון לא נמצא</h1>
          <p className="mt-2 text-gray-500">ייתכן שהקישור שגוי או שהאימון נמחק</p>
        </div>
      </div>
    );
  }

  const teamColor = team.theme_color_hex;
  const formattedDate = formatDate(practice.practice_date);
  const formattedTime = formatTime(practice.start_time);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50 pb-8"
      style={{ '--team-primary': teamColor } as React.CSSProperties}
    >
      {/* Team Header */}
      <div
        className="px-4 pb-12 pt-8 text-center text-white"
        style={{ backgroundColor: teamColor }}
      >
        <p className="text-sm text-white/80">{team.name}</p>
        <h1 className="mt-2 text-2xl font-bold">{practice.title}</h1>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Practice Details Card */}
        <div className="-mt-6 rounded-2xl bg-white p-6 shadow-lg">
          <div className="space-y-4 text-center">
            <div>
              <span className="text-sm text-gray-500">📅 תאריך</span>
              <p className="text-lg font-semibold">{formattedDate}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">🕐 שעה</span>
              <p className="text-lg font-semibold">
                {formattedTime}
                {practice.end_time && ` - ${formatTime(practice.end_time)}`}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">📍 מיקום</span>
              <p className="text-lg font-semibold">{practice.location}</p>
            </div>
          </div>
        </div>

        {/* STEP: Player Selection */}
        {step === 'select' && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
            <p className="mb-4 text-center text-xl font-bold text-gray-900">
              מי אתה? 🏀
            </p>
            <p className="mb-6 text-center text-sm text-gray-500">
              בחר את השם שלך מהרשימה
            </p>

            <div className="flex flex-col gap-2">
              {players.map((player) => {
                const inv = invitations.find((i) => i.player_id === player.id);
                const responded = inv && inv.response_status !== 'no_response';
                return (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className="flex items-center gap-3 rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-4 text-right transition-all hover:border-gray-300 hover:bg-white active:scale-[0.98]"
                  >
                    {player.jersey_number !== null ? (
                      <span
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: teamColor }}
                      >
                        {player.jersey_number}
                      </span>
                    ) : (
                      <span
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg text-white"
                        style={{ backgroundColor: teamColor }}
                      >
                        🏀
                      </span>
                    )}
                    <span className="flex-1 text-lg font-medium text-gray-900">
                      {player.full_name}
                    </span>
                    {responded && (
                      <span className="text-xs text-gray-400">
                        {inv.response_status === 'yes' && '✅'}
                        {inv.response_status === 'no' && '❌'}
                        {inv.response_status === 'maybe' && '🤔'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP: Details Confirmation */}
        {step === 'details' && selectedPlayer && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-center text-xl font-bold text-gray-900">
              שלום {selectedPlayer.playerName} 👋
            </p>
            <p className="mt-2 mb-6 text-center text-sm text-gray-500">
              בדוק שהפרטים שלך נכונים
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר טלפון
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="050-1234567"
                  dir="ltr"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': teamColor } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': teamColor } as React.CSSProperties}
                />
              </div>
            </div>

            <button
              onClick={handleSaveDetails}
              disabled={savingDetails}
              className="mt-6 w-full rounded-xl py-3 text-white font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: teamColor }}
            >
              {savingDetails ? 'שומר...' : 'אישור והמשך'}
            </button>

            <button
              onClick={handleSkipDetails}
              className="mt-3 w-full text-center text-sm text-gray-400 underline"
            >
              דלג
            </button>

            <button
              onClick={handleClearPlayer}
              className="mt-2 w-full text-center text-xs text-gray-300"
            >
              לא אתה? לחץ כאן
            </button>
          </div>
        )}

        {/* STEP: Response */}
        {step === 'respond' && selectedPlayer && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-center text-xl font-bold text-gray-900">
              שלום {selectedPlayer.playerName} 👋
            </p>
            <p className="mt-3 text-center text-lg text-gray-600">
              {isPast ? 'האימון כבר התקיים' : 'האם תגיע לאימון?'}
            </p>

            {/* Response Buttons */}
            <div className="mt-6 flex flex-col gap-3">
              {RESPONSE_OPTIONS.map((option) => {
                const isSelected = currentStatus === option.status && confirmed;
                return (
                  <button
                    key={option.status}
                    onClick={() => handleResponse(option.status)}
                    disabled={isPast || submitting}
                    className={`flex items-center justify-center gap-3 rounded-2xl border-2 px-6 py-5 text-xl font-bold transition-all ${
                      isSelected ? option.activeBg : option.bg
                    } ${isPast ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.97]'}`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Confirmation message */}
            {confirmed && (
              <div
                className="mt-6 rounded-2xl p-4 text-center"
                style={{ backgroundColor: `${teamColor}10` }}
              >
                <p className="text-lg font-semibold" style={{ color: teamColor }}>
                  {currentStatus === 'yes' && 'תודה! נתראה באימון 🏀'}
                  {currentStatus === 'no' && 'תודה על העדכון'}
                  {currentStatus === 'maybe' && 'תודה! עדכן כשתדע 🙏'}
                </p>
                {!isPast && (
                  <p className="mt-1 text-sm text-gray-500">
                    ניתן לשנות את התשובה עד לתחילת האימון
                  </p>
                )}
              </div>
            )}

            {isPast && (
              <p className="mt-4 text-center text-sm text-gray-400">
                האימון כבר התקיים - לא ניתן לשנות תשובה
              </p>
            )}

            {/* Switch player link */}
            <button
              onClick={handleClearPlayer}
              className="mt-6 block w-full text-center text-sm text-gray-400 underline"
            >
              לא אתה? לחץ כאן
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
