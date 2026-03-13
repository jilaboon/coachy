'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import type { Practice, Team, Player, Attendance } from '@/types/database';

interface PlayerAttendance {
  player: Player;
  attended: boolean;
}

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const practiceId = params.practiceId as string;

  const [practice, setPractice] = useState<Practice | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [playerAttendance, setPlayerAttendance] = useState<PlayerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch practice
      const { data: practiceData, error: practiceErr } = await supabase
        .from('practices')
        .select('*')
        .eq('id', practiceId)
        .single<Practice>();

      if (practiceErr || !practiceData) {
        setError('האימון לא נמצא');
        setLoading(false);
        return;
      }
      setPractice(practiceData);

      // Fetch team and verify coach
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', practiceData.team_id)
        .single<Team>();

      if (!teamData || teamData.coach_id !== user.id) {
        setError('אין גישה לאימון זה');
        setLoading(false);
        return;
      }
      setTeam(teamData);

      // Fetch players
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('active', true)
        .order('full_name')
        .returns<Player[]>();

      // Fetch existing attendance records
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('practice_id', practiceId)
        .returns<Attendance[]>();

      const attendanceMap = new Map<string, boolean>();
      (attendanceRecords ?? []).forEach((a) => {
        attendanceMap.set(a.player_id, a.actual_attended);
      });

      setPlayerAttendance(
        (players ?? []).map((player) => ({
          player,
          attended: attendanceMap.get(player.id) ?? false,
        }))
      );

      setLoading(false);
    }

    fetchData();
  }, [practiceId, router]);

  const toggleAttendance = (playerId: string) => {
    setPlayerAttendance((prev) =>
      prev.map((pa) =>
        pa.player.id === playerId ? { ...pa, attended: !pa.attended } : pa
      )
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const supabase = createClient();

    const upserts = playerAttendance.map((pa) => ({
      practice_id: practiceId,
      player_id: pa.player.id,
      actual_attended: pa.attended,
      marked_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from('attendance')
      .upsert(upserts, { onConflict: 'practice_id,player_id' });

    if (upsertError) {
      setError('שגיאה בשמירת הנוכחות');
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">טוען...</p>
        </div>
      </div>
    );
  }

  if (error && !practice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card p-8 text-center animate-fade-in-up">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-red-600">{error}</p>
          <Link href="/dashboard" className="btn btn-ghost mt-4 text-sm">
            חזרה ללוח הבקרה
          </Link>
        </div>
      </div>
    );
  }

  const attendedCount = playerAttendance.filter((pa) => pa.attended).length;
  const totalCount = playerAttendance.length;
  const progressPct = totalCount > 0 ? (attendedCount / totalCount) * 100 : 0;

  return (
    <div
      className="min-h-screen bg-slate-50 pb-28"
      style={{ '--team-primary': team?.theme_color_hex } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="relative px-4 pb-10 pt-6 text-white"
        style={{ backgroundColor: team?.theme_color_hex }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/15" />
        <div className="relative mx-auto max-w-lg">
          <Link
            href={`/practices/${practiceId}`}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 active:scale-[0.97]"
          >
            <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            חזרה לאימון
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">סימון נוכחות בפועל</h1>
          <p className="mt-1 text-sm font-medium text-white/80">{practice?.title}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Attendance Summary Card */}
        <div className="card -mt-6 animate-fade-in-up p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-500">נוכחים</span>
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: team?.theme_color_hex }}>
              {attendedCount} / {totalCount}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                backgroundColor: team?.theme_color_hex,
              }}
            />
          </div>
        </div>

        {/* Player List */}
        <div className="mt-4 space-y-1.5">
          {playerAttendance.map(({ player, attended }, idx) => (
            <div
              key={player.id}
              className="card flex items-center justify-between p-3.5 animate-slide-in"
              style={{ animationDelay: `${idx * 0.03}s`, opacity: 0 }}
            >
              {/* Player Info */}
              <div className="flex items-center gap-3 min-w-0">
                {player.jersey_number !== null ? (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm"
                    style={{ backgroundColor: team?.theme_color_hex }}
                  >
                    {player.jersey_number}
                  </span>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400">
                    —
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-800 truncate">{player.full_name}</span>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={attended}
                onClick={() => toggleAttendance(player.id)}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none active:scale-[0.95] ${
                  attended ? '' : 'bg-slate-200'
                }`}
                style={attended ? { backgroundColor: team?.theme_color_hex } : undefined}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
                    attended ? 'translate-x-1.5' : 'translate-x-6.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-4 animate-toast">
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        )}

        {/* Success Banner */}
        {saved && (
          <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center animate-toast">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-bold text-emerald-800">הנוכחות נשמרה בהצלחה!</p>
            <Link
              href={`/practices/${practiceId}`}
              className="mt-2 inline-block text-sm font-semibold transition-colors duration-200 hover:underline"
              style={{ color: team?.theme_color_hex }}
            >
              חזרה לדף האימון
            </Link>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: team?.theme_color_hex }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="btn-spinner h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                שומר...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                שמור נוכחות
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
