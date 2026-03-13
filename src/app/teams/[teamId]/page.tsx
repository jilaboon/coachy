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
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-8"
      style={{ '--team-primary': team.theme_color_hex } as React.CSSProperties}
    >
      {/* Hero Header */}
      <div
        className="relative px-4 pt-5 pb-7 text-white overflow-hidden"
        style={{ backgroundColor: team.theme_color_hex }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)'
        }} />

        <div className="relative max-w-lg mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-all duration-200 mb-4 backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            חזרה לדשבורד
          </Link>
          <div className="flex items-center gap-3">
            {team.logo_url && (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 backdrop-blur-sm shrink-0 border border-white/30">
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-white/75 text-sm mt-1">{team.age_group}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6 max-w-lg mx-auto">
        {/* Action Buttons */}
        <div className="flex gap-2.5">
          <Link
            href={`/teams/${teamId}/players`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white font-medium text-sm shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
            style={{ backgroundColor: team.theme_color_hex }}
          >
            <span className="text-base">👤</span>
            הוסף שחקן
          </Link>
          <Link
            href={`/teams/${teamId}/practices/new`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white font-medium text-sm shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
            style={{ backgroundColor: team.theme_color_hex }}
          >
            <span className="text-base">📋</span>
            אימון חדש
          </Link>
          <Link
            href={`/teams/${teamId}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-medium text-sm hover:bg-gray-50 active:scale-[0.97] transition-all duration-200"
            style={{ borderColor: team.theme_color_hex, color: team.theme_color_hex }}
          >
            <span className="text-base">✏️</span>
            עריכת קבוצה
          </Link>
        </div>

        {/* Players Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">שחקנים</h2>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: team.theme_color_hex }}
            >
              {players?.length || 0}
            </span>
          </div>
          {players && players.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ${
                    index % 2 === 1 ? 'bg-gray-50/50' : ''
                  } ${index < players.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: team.theme_color_hex }}
                  >
                    {player.jersey_number ?? '-'}
                  </span>
                  <span className="font-medium text-gray-900">{player.full_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">אין שחקנים עדיין</p>
              <Link
                href={`/teams/${teamId}/players`}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg active:scale-[0.97] transition-all duration-200"
                style={{ color: team.theme_color_hex }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                הוסף את השחקן הראשון
              </Link>
            </div>
          )}
        </section>

        {/* Upcoming Practices */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">אימונים קרובים</h2>
            {upcomingPractices && upcomingPractices.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                {upcomingPractices.length}
              </span>
            )}
          </div>
          {upcomingPractices && upcomingPractices.length > 0 ? (
            <div className="space-y-3">
              {upcomingPractices.map((practice, index) => (
                <Link
                  key={practice.id}
                  href={`/practices/${practice.id}`}
                  className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.98] transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex">
                    {/* Team color accent */}
                    <div
                      className="w-1 self-stretch"
                      style={{ backgroundColor: team.theme_color_hex }}
                    />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{practice.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(practice.practice_date).toLocaleDateString('he-IL', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                              🕐 {practice.start_time.slice(0, 5)}
                              {practice.end_time ? ` - ${practice.end_time.slice(0, 5)}` : ''}
                            </span>
                            {practice.location && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate">
                                📍 {practice.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors duration-200 rotate-180 shrink-0 mt-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">אין אימונים קרובים</p>
              <Link
                href={`/teams/${teamId}/practices/new`}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg active:scale-[0.97] transition-all duration-200"
                style={{ color: team.theme_color_hex }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                צור אימון חדש
              </Link>
            </div>
          )}
        </section>

        {/* Past Practices */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">אימונים קודמים</h2>
            {pastPractices && pastPractices.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                {pastPractices.length}
              </span>
            )}
          </div>
          {pastPractices && pastPractices.length > 0 ? (
            <div className="space-y-2.5">
              {pastPractices.map((practice) => (
                <Link
                  key={practice.id}
                  href={`/practices/${practice.id}`}
                  className="group block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 opacity-60 hover:opacity-100 active:scale-[0.98] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700">{practice.title}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {new Date(practice.practice_date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                        practice.status === 'completed'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {practice.status === 'completed' ? 'הושלם' : 'בוטל'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm text-gray-400">אין אימונים קודמים</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
