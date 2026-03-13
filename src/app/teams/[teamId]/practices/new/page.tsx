'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { Team, Player } from '@/types/database';

export default function NewPracticePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasDefaultLocation, setHasDefaultLocation] = useState(false);

  // Form fields
  const [title, setTitle] = useState('אימון');
  const [practiceDate, setPracticeDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function loadTeam() {
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single<Team>();

    if (!teamData) {
      router.push('/dashboard');
      return;
    }
    setTeam(teamData);
    if ((teamData as Team & { default_location?: string | null }).default_location) {
      setLocation((teamData as Team & { default_location?: string | null }).default_location!);
      setHasDefaultLocation(true);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // 1. Insert practice
    const { data: practice, error: practiceError } = await supabase
      .from('practices')
      .insert({
        team_id: teamId,
        title: title.trim(),
        practice_date: practiceDate,
        start_time: startTime,
        end_time: endTime || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        status: 'upcoming',
      })
      .select('id')
      .single();

    if (practiceError || !practice) {
      setSaving(false);
      alert('שגיאה ביצירת האימון');
      return;
    }

    // 2. Fetch active players
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', teamId)
      .eq('active', true)
      .returns<Pick<Player, 'id'>[]>();

    if (players && players.length > 0) {
      // 3. Create invitations + attendance rows
      const invitations = players.map((p) => ({
        practice_id: practice.id,
        player_id: p.id,
        token: crypto.randomUUID(),
        response_status: 'no_response' as const,
      }));

      const attendanceRows = players.map((p) => ({
        practice_id: practice.id,
        player_id: p.id,
        actual_attended: false,
      }));

      await Promise.all([
        supabase.from('invitations').insert(invitations),
        supabase.from('attendance').insert(attendanceRows),
      ]);
    }

    // 4. Redirect
    router.push(`/practices/${practice.id}`);
  }

  if (loading || !team) {
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

  const color = team.theme_color_hex;

  return (
    <div
      className="min-h-screen bg-slate-50 pb-12"
      style={{ '--team-primary': color } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="relative px-4 pb-10 pt-6 text-white"
        style={{ backgroundColor: color }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/15" />
        <div className="relative mx-auto max-w-lg">
          <button
            onClick={() => router.push(`/teams/${teamId}`)}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 active:scale-[0.97]"
          >
            <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            חזרה לקבוצה
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">אימון חדש</h1>
          <p className="mt-1 text-sm font-medium text-white/80">{team.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        <form onSubmit={handleSubmit} className="card -mt-6 animate-fade-in-up p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">כותרת</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">תאריך</label>
            <input
              type="date"
              required
              value={practiceDate}
              onChange={(e) => setPracticeDate(e.target.value)}
              className="input"
              dir="ltr"
            />
          </div>

          {/* Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">שעת התחלה</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                שעת סיום
                <span className="mr-1 text-xs font-normal text-slate-400">(אופציונלי)</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
                dir="ltr"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              מיקום
              <span className="mr-1 text-xs font-normal text-slate-400">(אופציונלי)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setHasDefaultLocation(false);
                }}
                placeholder="לדוגמה: אולם הספורט העירוני"
                className="input"
              />
              {hasDefaultLocation && location && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 badge badge-success text-[10px]">
                  ברירת מחדל
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              הערות
              <span className="mr-1 text-xs font-normal text-slate-400">(אופציונלי)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="הוסף הערות לשחקנים..."
              className="input resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim() || !practiceDate || !startTime}
            className="btn btn-primary w-full py-3.5 text-base font-bold"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="btn-spinner h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                יוצר אימון...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                צור אימון
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
