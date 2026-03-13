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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  if (error && !practice) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            חזרה ללוח הבקרה
          </Link>
        </div>
      </div>
    );
  }

  const attendedCount = playerAttendance.filter((pa) => pa.attended).length;

  return (
    <div
      className="min-h-screen bg-gray-50 pb-8"
      style={{ '--team-primary': team?.theme_color_hex } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="px-4 py-6 text-white"
        style={{ backgroundColor: team?.theme_color_hex }}
      >
        <div className="mx-auto max-w-lg">
          <Link
            href={`/practices/${practiceId}`}
            className="mb-3 inline-block text-sm text-white/80 hover:text-white"
          >
            → חזרה לאימון
          </Link>
          <h1 className="text-2xl font-bold">סימון נוכחות בפועל</h1>
          <p className="mt-1 text-white/90">{practice?.title}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Summary */}
        <div className="-mt-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">נוכחים</span>
            <span className="text-xl font-bold" style={{ color: team?.theme_color_hex }}>
              {attendedCount} / {playerAttendance.length}
            </span>
          </div>
        </div>

        {/* Player List */}
        <div className="mt-4 space-y-2">
          {playerAttendance.map(({ player, attended }) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {player.jersey_number !== null && (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: team?.theme_color_hex }}
                  >
                    {player.jersey_number}
                  </span>
                )}
                <span className="font-medium">{player.full_name}</span>
              </div>
              <button
                onClick={() => toggleAttendance(player.id)}
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  attended ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    attended ? 'start-1' : 'end-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-center text-red-700">
            {error}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl py-4 text-lg font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: team?.theme_color_hex }}
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>

        {/* Success */}
        {saved && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-center">
            <p className="font-medium text-green-800">הנוכחות נשמרה בהצלחה!</p>
            <Link
              href={`/practices/${practiceId}`}
              className="mt-2 inline-block text-sm font-medium hover:underline"
              style={{ color: team?.theme_color_hex }}
            >
              חזרה לדף האימון
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
