import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Coach, Team } from '@/types/database';
import TeamCard from './TeamCard';

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-4 py-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">שלום, {coach.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">הקבוצות שלך</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center shadow-sm">
            <span className="text-lg">🏀</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-28">
        {teams && teams.length > 0 ? (
          <div className="space-y-3">
            {teams.map((team, index) => (
              <TeamCard key={team.id} team={team} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-[fadeIn_0.4s_ease-out]">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">🏀</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">אין קבוצות עדיין</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              צור את הקבוצה הראשונה שלך<br />ותתחיל לנהל אימונים ונוכחות
            </p>
            <Link
              href="/dashboard/new-team"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm shadow-lg hover:bg-gray-800 active:scale-[0.97] transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              קבוצה חדשה
            </Link>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {teams && teams.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20">
          <div className="max-w-lg mx-auto">
            <Link
              href="/dashboard/new-team"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm shadow-lg hover:bg-gray-800 active:scale-[0.97] transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              קבוצה חדשה
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
