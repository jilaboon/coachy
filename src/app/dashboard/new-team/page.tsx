'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { TEAM_COLORS } from '@/types/database';

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [defaultLocation, setDefaultLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('נא להזין שם קבוצה');
      return;
    }

    if (!ageGroup.trim()) {
      setError('נא להזין קבוצת גיל');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const color = TEAM_COLORS[selectedColor];

    const { data, error: insertError } = await supabase
      .from('teams')
      .insert({
        coach_id: user.id,
        name: name.trim(),
        age_group: ageGroup.trim(),
        theme_color_name: color.name,
        theme_color_hex: color.hex,
        default_location: defaultLocation.trim() || null,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      setLoading(false);
      setError('שגיאה ביצירת הקבוצה, נסה שוב');
      return;
    }

    router.push(`/teams/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">קבוצה חדשה</h1>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            ביטול
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
        >
          {/* Team Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              שם הקבוצה
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm transition-all duration-200"
              placeholder='לדוגמה: הפועל תל אביב נוער'
            />
          </div>

          {/* Age Group */}
          <div>
            <label htmlFor="ageGroup" className="block text-sm font-semibold text-gray-700 mb-2">
              קבוצת גיל
            </label>
            <input
              id="ageGroup"
              type="text"
              required
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm transition-all duration-200"
              placeholder='לדוגמה: ילדים א, נוער, בוגרים'
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              צבע הקבוצה
            </label>
            <div className="flex flex-wrap gap-3">
              {TEAM_COLORS.map((color, index) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(index)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
                    selectedColor === index
                      ? 'ring-[3px] ring-offset-2 ring-offset-white shadow-lg'
                      : 'shadow-sm hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: color.hex,
                    ...(selectedColor === index ? { ringColor: color.hex, '--tw-ring-color': color.hex } as React.CSSProperties : {}),
                  }}
                  title={color.name}
                  aria-label={color.name}
                >
                  {selectedColor === index && (
                    <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">
              {TEAM_COLORS[selectedColor].name}
            </p>
          </div>

          {/* Default Location */}
          <div>
            <label htmlFor="defaultLocation" className="block text-sm font-semibold text-gray-700 mb-2">
              מיקום אימון קבוע
              <span className="font-normal text-gray-400 mr-1">(אופציונלי)</span>
            </label>
            <input
              id="defaultLocation"
              type="text"
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm transition-all duration-200"
              placeholder='לדוגמה: אולם הספורט העירוני'
            />
            <p className="text-xs text-gray-400 mt-1.5">ימולא אוטומטית ביצירת אימון חדש</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                יוצר קבוצה...
              </>
            ) : (
              'צור קבוצה'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
