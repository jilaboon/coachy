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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">טוען...</p>
      </div>
    );
  }

  const color = team.theme_color_hex;

  return (
    <div
      className="min-h-screen bg-gray-50 pb-8"
      style={{ '--team-primary': color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="px-4 py-6 text-white" style={{ backgroundColor: color }}>
        <button
          onClick={() => router.push(`/teams/${teamId}`)}
          className="text-white/80 text-sm mb-2"
        >
          &rarr; חזרה לקבוצה
        </button>
        <h1 className="text-2xl font-bold">אימון חדש</h1>
        <p className="text-white/80 text-sm mt-1">{team.name}</p>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כותרת</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
            <input
              type="date"
              required
              value={practiceDate}
              onChange={(e) => setPracticeDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
              dir="ltr"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שעת התחלה</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
              dir="ltr"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שעת סיום (אופציונלי)</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
              dir="ltr"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מיקום (אופציונלי)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="לדוגמה: אולם הספורט העירוני"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim() || !practiceDate || !startTime}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {saving ? 'יוצר אימון...' : 'צור אימון'}
          </button>
        </form>
      </div>
    </div>
  );
}
