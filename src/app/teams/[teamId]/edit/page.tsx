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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
    setLogoUrl((team as Team & { logo_url?: string | null }).logo_url || null);
    const found = TEAM_COLORS.find((c) => c.hex === team.theme_color_hex);
    if (found) setSelectedColor(found);
    setLoading(false);
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('הקובץ גדול מדי. מקסימום 5MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let finalLogoUrl = logoUrl;

    // Upload logo if a new file was selected
    if (logoFile) {
      setUploadingLogo(true);
      const ext = logoFile.name.split('.').pop() || 'png';
      const path = `${teamId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(path, logoFile, { upsert: true });

      if (uploadError) {
        setSaving(false);
        setUploadingLogo(false);
        alert('שגיאה בהעלאת הלוגו');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(path);

      finalLogoUrl = urlData.publicUrl;
      setUploadingLogo(false);
    }

    await supabase
      .from('teams')
      .update({
        name: name.trim(),
        age_group: ageGroup.trim(),
        theme_color_name: selectedColor.name,
        theme_color_hex: selectedColor.hex,
        default_location: defaultLocation.trim() || null,
        logo_url: finalLogoUrl,
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
          {/* Team Logo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">לוגו הקבוצה</label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0"
                style={logoPreview || logoUrl ? { borderStyle: 'solid', borderColor: selectedColor.hex } : {}}
              >
                {logoPreview || logoUrl ? (
                  <img
                    src={logoPreview || logoUrl || ''}
                    alt="לוגו הקבוצה"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <label
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-100 active:scale-[0.97]"
                  style={{ color: selectedColor.hex, border: `1.5px solid ${selectedColor.hex}` }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  {logoPreview || logoUrl ? 'החלף לוגו' : 'העלה לוגו'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1.5">PNG, JPG או WebP. עד 5MB</p>
              </div>
            </div>
          </div>

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
                {uploadingLogo ? 'מעלה לוגו...' : 'שומר...'}
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
