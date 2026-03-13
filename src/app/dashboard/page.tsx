import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Coach, Team } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: coach } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', user.id)
    .single<Coach>();

  if (!coach) redirect('/login');

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Team[]>();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">שלום, {coach.full_name} 👋</h1>
            <p className="text-xs text-gray-500">הקבוצות שלך</p>
          </div>
          <div className="text-2xl">🏀</div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {teams && teams.length > 0 ? (
          <div className="space-y-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                style={{ '--team-primary': team.theme_color_hex } as React.CSSProperties}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: team.theme_color_hex }}
                  />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base truncate">{team.name}</h2>
                    <p className="text-sm text-gray-500">{team.age_group}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-300 mr-auto rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏀</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">אין קבוצות עדיין</h2>
            <p className="text-sm text-gray-500 mb-6">צור את הקבוצה הראשונה שלך</p>
          </div>
        )}

        <Link
          href="/dashboard/new-team"
          className="mt-6 block w-full text-center py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          + קבוצה חדשה
        </Link>
      </main>
    </div>
  );
}
