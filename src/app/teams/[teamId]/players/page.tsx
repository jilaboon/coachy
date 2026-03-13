'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { Team, Player } from '@/types/database';

export default function PlayersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJersey, setFormJersey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function loadData() {
    setLoading(true);

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

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('active', { ascending: false })
      .order('jersey_number', { ascending: true })
      .returns<Player[]>();

    setPlayers(playersData || []);
    setLoading(false);
  }

  function resetForm() {
    setFormName('');
    setFormPhone('');
    setFormJersey('');
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(player: Player) {
    setFormName(player.full_name);
    setFormPhone(player.phone);
    setFormJersey(player.jersey_number?.toString() || '');
    setEditingId(player.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      full_name: formName.trim(),
      phone: formPhone.trim(),
      jersey_number: formJersey ? parseInt(formJersey) : null,
    };

    if (editingId) {
      await supabase
        .from('players')
        .update(payload)
        .eq('id', editingId);
    } else {
      await supabase
        .from('players')
        .insert({ ...payload, team_id: teamId, active: true });
    }

    setSaving(false);
    resetForm();
    loadData();
  }

  async function toggleActive(player: Player) {
    await supabase
      .from('players')
      .update({ active: !player.active })
      .eq('id', player.id);
    loadData();
  }

  if (loading || !team) {
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

  const color = team.theme_color_hex;
  const activePlayers = players.filter((p) => p.active);
  const inactivePlayers = players.filter((p) => !p.active);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-8"
      style={{ '--team-primary': color } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="relative px-4 pt-5 pb-7 text-white overflow-hidden"
        style={{ backgroundColor: color }}
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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">שחקנים — {team.name}</h1>
            <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-full">
              {activePlayers.length}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-4">
        {/* Add Player Button */}
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
            style={{ backgroundColor: color }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            הוסף שחקן
          </button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-4 animate-[slideDown_0.25s_ease-out]"
          >
            <h3 className="font-bold text-lg text-gray-900">
              {editingId ? '✏️ עריכת שחקן' : '➕ שחקן חדש'}
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">שם מלא</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
                placeholder="שם השחקן"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">טלפון</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
                dir="ltr"
                placeholder="050-0000000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">מספר חולצה</label>
              <input
                type="number"
                min={0}
                max={99}
                value={formJersey}
                onChange={(e) => setFormJersey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
                dir="ltr"
                placeholder="0-99"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving || !formName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
                style={{ backgroundColor: color }}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    שומר...
                  </>
                ) : editingId ? (
                  'עדכן'
                ) : (
                  'הוסף'
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-sm text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all duration-200"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Active Players List */}
        {activePlayers.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {activePlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  index % 2 === 1 ? 'bg-gray-50/50' : ''
                } ${index < activePlayers.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* Jersey badge */}
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {player.jersey_number ?? '-'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{player.full_name}</p>
                  {player.phone && (
                    <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{player.phone}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(player)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-[0.90] transition-all duration-200"
                    title="ערוך"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleActive(player)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 active:scale-[0.90] transition-all duration-200"
                    title="השבת שחקן"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !showForm ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">אין שחקנים עדיין</h3>
            <p className="text-sm text-gray-400">הוסף את השחקן הראשון לקבוצה</p>
          </div>
        ) : null}

        {/* Inactive Players */}
        {inactivePlayers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 mt-2">
              <h3 className="text-sm font-semibold text-gray-400">שחקנים לא פעילים</h3>
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">
                {inactivePlayers.length}
              </span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {inactivePlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-4 py-3 opacity-50 ${
                    index < inactivePlayers.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 bg-gray-300">
                    {player.jersey_number ?? '-'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-500 truncate line-through">{player.full_name}</p>
                    {player.phone && (
                      <p className="text-xs text-gray-300 mt-0.5" dir="ltr">{player.phone}</p>
                    )}
                  </div>

                  <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full font-medium shrink-0">
                    לא פעיל
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(player)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 active:scale-[0.90] transition-all duration-200"
                      title="ערוך"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleActive(player)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-green-400 hover:text-green-600 hover:bg-green-50 active:scale-[0.90] transition-all duration-200"
                      title="הפעל שחקן"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
