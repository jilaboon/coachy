'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { TEAM_COLORS } from '@/types/database';
import type { Team } from '@/types/database';

export default function EditTeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string }>(TEAM_COLORS[0]);
  const [defaultLocation, setDefaultLocation] = useState('');

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function loadTeam() {
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single<Team>();

    if (!team) {
      router.push('/dashboard');
      return;
    }

    setName(team.name);
    setAgeGroup(team.age_group);
    setDefaultLocation((team as Team & { default_location?: string | null }).default_location || '');
    const found = TEAM_COLORS.find((c) => c.hex === team.theme_color_hex);
    if (found) setSelectedColor(found);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await supabase
      .from('teams')
      .update({
        name: name.trim(),
        age_group: ageGroup.trim(),
        theme_color_name: selectedColor.name,
        theme_color_hex: selectedColor.hex,
        default_location: defaultLocation.trim() || null,
      })
      .eq('id', teamId);

    setSaving(false);
    router.push(`/teams/${teamId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-8"
      style={{ '--team-primary': selectedColor.hex } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="relative px-4 pt-5 pb-7 text-white overflow-hidden"
        style={{ backgroundColor: selectedColor.hex }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)'
        }} />
        <div className="relative max-w-lg mx-auto">
          <button
            onClick={() => router.push(`/teams/${teamId}`)}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-all duration-200 mb-4 backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            חזרה לקבוצה
          </button>
          <h1 className="text-2xl font-bold">עריכת קבוצה</h1>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם הקבוצה</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
              style={{ '--tw-ring-color': selectedColor.hex } as React.CSSProperties}
            />
          </div>

          {/* Age Group */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">שכבת גיל</label>
            <input
              type="text"
              required
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              placeholder='לדוגמה: ילדים א׳, נוער, בוגרים'
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
              style={{ '--tw-ring-color': selectedColor.hex } as React.CSSProperties}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">צבע הקבוצה</label>
            <div className="flex gap-3 flex-wrap">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 ${
                    selectedColor.hex === color.hex
                      ? 'ring-[3px] ring-offset-2 ring-offset-white shadow-lg'
                      : 'shadow-sm hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: color.hex,
                    ...(selectedColor.hex === color.hex ? { '--tw-ring-color': color.hex } as React.CSSProperties : {}),
                  }}
                  title={color.name}
                >
                  {selectedColor.hex === color.hex && (
                    <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">{selectedColor.name}</p>
          </div>

          {/* Default Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              מיקום אימון קבוע
              <span className="font-normal text-gray-400 mr-1">(אופציונלי)</span>
            </label>
            <input
              type="text"
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="לדוגמה: אולם הספורט העירוני"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
              style={{ '--tw-ring-color': selectedColor.hex } as React.CSSProperties}
            />
            <p className="text-xs text-gray-400 mt-1.5">ימולא אוטומטית ביצירת אימון חדש</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !name.trim() || !ageGroup.trim()}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
            style={{ backgroundColor: selectedColor.hex }}
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                שומר...
              </>
            ) : (
              'שמור שינויים'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
