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
      })
      .eq('id', teamId);

    setSaving(false);
    router.push(`/teams/${teamId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">טוען...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 pb-8"
      style={{ '--team-primary': selectedColor.hex } as React.CSSProperties}
    >
      {/* Header */}
      <div className="px-4 py-6 text-white" style={{ backgroundColor: selectedColor.hex }}>
        <button
          onClick={() => router.push(`/teams/${teamId}`)}
          className="text-white/80 text-sm mb-2"
        >
          &rarr; חזרה לקבוצה
        </button>
        <h1 className="text-2xl font-bold">עריכת קבוצה</h1>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם הקבוצה</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': selectedColor.hex } as React.CSSProperties}
            />
          </div>

          {/* Age Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שכבת גיל</label>
            <input
              type="text"
              required
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              placeholder='לדוגמה: ילדים א׳, נוער, בוגרים'
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': selectedColor.hex } as React.CSSProperties}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">צבע הקבוצה</label>
            <div className="flex gap-3 flex-wrap">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-10 h-10 rounded-full transition-all flex items-center justify-center"
                  style={{
                    backgroundColor: color.hex,
                    outline: selectedColor.hex === color.hex ? `3px solid ${color.hex}` : 'none',
                    outlineOffset: '3px',
                  }}
                  title={color.name}
                >
                  {selectedColor.hex === color.hex && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedColor.name}</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !name.trim() || !ageGroup.trim()}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: selectedColor.hex }}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </form>
      </div>
    </div>
  );
}
