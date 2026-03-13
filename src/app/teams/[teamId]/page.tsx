import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Team, Player, Practice } from '@/types/database';

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single<Team>();

  if (!team || team.coach_id !== user.id) redirect('/dashboard');

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .eq('active', true)
    .order('jersey_number', { ascending: true })
    .returns<Player[]>();

  const now = new Date().toISOString().split('T')[0];

  const { data: upcomingPractices } = await supabase
    .from('practices')
    .select('*')
    .eq('team_id', teamId)
    .gte('practice_date', now)
    .eq('status', 'upcoming')
    .order('practice_date', { ascending: true })
    .limit(10)
    .returns<Practice[]>();

  const { data: pastPractices } = await supabase
    .from('practices')
    .select('*')
    .eq('team_id', teamId)
    .lt('practice_date', now)
    .order('practice_date', { ascending: false })
    .limit(10)
    .returns<Practice[]>();

  return (
    <div
      className="min-h-screen bg-gray-50 pb-8"
      style={{ '--team-primary': team.theme_color_hex } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="px-4 py-6 text-white"
        style={{ backgroundColor: team.theme_color_hex }}
      >
        <Link href="/dashboard" className="text-white/80 text-sm mb-2 inline-block">
          &rarr; חזרה לדשבורד
        </Link>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-white/80 text-sm mt-1">{team.age_group}</p>
      </div>

      <div className="px-4 mt-6 space-y-6 max-w-lg mx-auto">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/teams/${teamId}/players`}
            className="flex-1 text-center py-3 rounded-xl text-white font-medium text-sm"
            style={{ backgroundColor: team.theme_color_hex }}
          >
            הוסף שחקן
          </Link>
          <Link
            href={`/teams/${teamId}/practices/new`}
            className="flex-1 text-center py-3 rounded-xl text-white font-medium text-sm"
            style={{ backgroundColor: team.theme_color_hex }}
          >
            אימון חדש
          </Link>
          <Link
            href={`/teams/${teamId}/edit`}
            className="flex-1 text-center py-3 rounded-xl border-2 font-medium text-sm"
            style={{ borderColor: team.theme_color_hex, color: team.theme_color_hex }}
          >
            עריכת קבוצה
          </Link>
        </div>

        {/* Players Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">שחקנים</h2>
            <span className="text-sm text-gray-500">{players?.length || 0} שחקנים</span>
          </div>
          {players && players.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: team.theme_color_hex }}
                  >
                    {player.jersey_number ?? '-'}
                  </span>
                  <span className="font-medium">{player.full_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">
              אין שחקנים עדיין
            </div>
          )}
        </section>

        {/* Upcoming Practices */}
        <section>
          <h2 className="text-lg font-bold mb-3">אימונים קרובים</h2>
          {upcomingPractices && upcomingPractices.length > 0 ? (
            <div className="space-y-3">
              {upcomingPractices.map((practice) => (
                <Link
                  key={practice.id}
                  href={`/practices/${practice.id}`}
                  className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{practice.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(practice.practice_date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                        {' '}
                        &middot; {practice.start_time.slice(0, 5)}
                        {practice.end_time ? ` - ${practice.end_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <span className="text-gray-400">&larr;</span>
                  </div>
                  {practice.location && (
                    <p className="text-xs text-gray-400 mt-2">{practice.location}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">
              אין אימונים קרובים
            </div>
          )}
        </section>

        {/* Past Practices */}
        <section>
          <h2 className="text-lg font-bold mb-3">אימונים קודמים</h2>
          {pastPractices && pastPractices.length > 0 ? (
            <div className="space-y-3">
              {pastPractices.map((practice) => (
                <Link
                  key={practice.id}
                  href={`/practices/${practice.id}`}
                  className="block bg-white rounded-xl shadow-sm p-4 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{practice.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(practice.practice_date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: practice.status === 'completed' ? '#dcfce7' : '#fee2e2',
                        color: practice.status === 'completed' ? '#166534' : '#991b1b',
                      }}
                    >
                      {practice.status === 'completed' ? 'הושלם' : 'בוטל'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">
              אין אימונים קודמים
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
