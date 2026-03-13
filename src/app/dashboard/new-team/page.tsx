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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">קבוצה חדשה</h1>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ביטול
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              שם הקבוצה
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder='לדוגמה: הפועל תל אביב נוער'
            />
          </div>

          <div>
            <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 mb-1">
              קבוצת גיל
            </label>
            <input
              id="ageGroup"
              type="text"
              required
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder='לדוגמה: ילדים א, נוער, בוגרים'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              צבע הקבוצה
            </label>
            <div className="flex flex-wrap gap-3">
              {TEAM_COLORS.map((color, index) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(index)}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  aria-label={color.name}
                >
                  {selectedColor === index && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {TEAM_COLORS[selectedColor].name}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'יוצר קבוצה...' : 'צור קבוצה'}
          </button>
        </form>
      </main>
    </div>
  );
}
