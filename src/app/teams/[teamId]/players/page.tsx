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
        <h1 className="text-2xl font-bold">שחקנים - {team.name}</h1>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-4">
        {/* Add Player Button */}
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full py-3 rounded-xl text-white font-medium text-sm"
            style={{ backgroundColor: color }}
          >
            + הוסף שחקן
          </button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm p-4 space-y-4"
          >
            <h3 className="font-bold text-lg">
              {editingId ? 'עריכת שחקן' : 'שחקן חדש'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מספר חולצה</label>
              <input
                type="number"
                min={0}
                max={99}
                value={formJersey}
                onChange={(e) => setFormJersey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
                dir="ltr"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || !formName.trim()}
                className="flex-1 py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
                style={{ backgroundColor: color }}
              >
                {saving ? 'שומר...' : editingId ? 'עדכן' : 'הוסף'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-sm text-gray-600"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Players List */}
        {players.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 ${!player.active ? 'opacity-40' : ''}`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: player.active ? color : '#9ca3af' }}
                >
                  {player.jersey_number ?? '-'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{player.full_name}</p>
                  {player.phone && (
                    <p className="text-xs text-gray-400 dir-ltr" dir="ltr">{player.phone}</p>
                  )}
                </div>
                {!player.active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex-shrink-0">
                    לא פעיל
                  </span>
                )}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(player)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => toggleActive(player)}
                    className="text-xs hover:text-gray-700"
                    style={{ color: player.active ? '#dc2626' : '#16a34a' }}
                  >
                    {player.active ? 'השבת' : 'הפעל'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">
            אין שחקנים עדיין. הוסף את השחקן הראשון!
          </div>
        )}
      </div>
    </div>
  );
}
