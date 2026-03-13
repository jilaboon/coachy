import { createClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { Practice, Team, Player, Invitation, Attendance, ResponseStatus } from '@/types/database';
import ShareButtons from '@/components/ShareButtons';
import AttendanceReport from './AttendanceReport';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

const STATUS_CONFIG: Record<ResponseStatus, { label: string; bg: string; text: string; border: string; ringColor: string }> = {
  yes: { label: 'מגיעים', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ringColor: 'ring-emerald-500/20' },
  no: { label: 'לא מגיעים', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ringColor: 'ring-red-500/20' },
  maybe: { label: 'אולי', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ringColor: 'ring-amber-500/20' },
  no_response: { label: 'טרם ענו', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', ringColor: 'ring-slate-500/20' },
};

const STATUS_NUMBER_COLOR: Record<ResponseStatus, string> = {
  yes: 'text-emerald-600',
  no: 'text-red-600',
  maybe: 'text-amber-600',
  no_response: 'text-slate-400',
};

export default async function PracticeDashboard({
  params,
}: {
  params: Promise<{ practiceId: string }>;
}) {
  const { practiceId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch practice
  const { data: practice, error: practiceError } = await supabase
    .from('practices')
    .select('*')
    .eq('id', practiceId)
    .single<Practice>();

  if (practiceError || !practice) notFound();

  // Fetch team and verify coach ownership
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', practice.team_id)
    .single<Team>();

  if (!team || team.coach_id !== user.id) notFound();

  // Fetch players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', team.id)
    .eq('active', true)
    .order('full_name')
    .returns<Player[]>();

  // Fetch invitations for this practice
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('practice_id', practiceId)
    .returns<Invitation[]>();

  // Fetch attendance records
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select('*')
    .eq('practice_id', practiceId)
    .returns<Attendance[]>();

  const attendanceMap = new Map<string, boolean>();
  (attendanceRecords ?? []).forEach((a) => attendanceMap.set(a.player_id, a.actual_attended));

  const invitationMap = new Map<string, Invitation>();
  (invitations ?? []).forEach((inv) => invitationMap.set(inv.player_id, inv));

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const practiceLink = `${BASE_URL}/p/${practiceId}`;
  const formattedDate = formatDate(practice.practice_date);
  const formattedTime = formatTime(practice.start_time);

  // Group players by response status
  type PlayerWithInvitation = Player & { invitation?: Invitation };
  const grouped: Record<ResponseStatus, PlayerWithInvitation[]> = {
    yes: [],
    no: [],
    maybe: [],
    no_response: [],
  };

  (players ?? []).forEach((player) => {
    const inv = invitationMap.get(player.id);
    const status: ResponseStatus = inv?.response_status ?? 'no_response';
    grouped[status].push({ ...player, invitation: inv });
  });

  const statusOrder: ResponseStatus[] = ['yes', 'no', 'maybe', 'no_response'];

  return (
    <div
      className="min-h-screen bg-slate-50 pb-12"
      style={{ '--team-primary': team.theme_color_hex } as React.CSSProperties}
    >
      {/* Hero Header */}
      <div
        className="relative px-4 pb-10 pt-6 text-white"
        style={{ backgroundColor: team.theme_color_hex }}
      >
        {/* Subtle overlay pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/15" />
        <div className="relative mx-auto max-w-lg">
          <Link
            href="/dashboard"
            className="btn-ghost mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 active:scale-[0.97]"
          >
            <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            לוח הבקרה
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{practice.title}</h1>
          <p className="mt-1 text-sm font-medium text-white/80">{team.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Practice Details Card */}
        <div className="card -mt-6 animate-fade-in-up p-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400">תאריך</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{formattedDate}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400">שעה</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formattedTime}
                  {practice.end_time && ` - ${formatTime(practice.end_time)}`}
                </p>
              </div>
            </div>

            {/* Location */}
            {practice.location && (
              <div className="col-span-2 flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-400">מיקום</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{practice.location}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {practice.notes && (
              <div className="col-span-2 flex items-start gap-2.5 border-t border-slate-100 pt-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-400">הערות</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{practice.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-4 animate-slide-in delay-1">
          <ShareButtons
            practiceLink={practiceLink}
            teamName={team.name}
            date={formattedDate}
            time={formattedTime}
            location={practice.location}
          />
        </div>

        {/* Attendance Action Button */}
        <div className="mt-4 animate-slide-in delay-2">
          <Link
            href={`/practices/${practiceId}/attendance`}
            className="btn btn-secondary flex w-full items-center justify-center gap-2 py-3.5 text-base font-bold"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
            סימון נוכחות בפועל
          </Link>
        </div>

        {/* Response Counters */}
        <div className="mt-6 grid grid-cols-4 gap-2 animate-slide-in delay-3">
          {statusOrder.map((status) => {
            const config = STATUS_CONFIG[status];
            const numberColor = STATUS_NUMBER_COLOR[status];
            return (
              <div
                key={status}
                className={`rounded-2xl border ${config.border} ${config.bg} p-3 text-center ring-1 ${config.ringColor} transition-all duration-200 hover:shadow-sm`}
              >
                <p className={`text-3xl font-extrabold tabular-nums ${numberColor}`}>
                  {grouped[status].length}
                </p>
                <p className={`mt-1 text-[11px] font-semibold ${config.text}`}>{config.label}</p>
              </div>
            );
          })}
        </div>

        {/* Player Lists by Status */}
        {statusOrder.map((status, groupIdx) => {
          const group = grouped[status];
          if (group.length === 0) return null;
          const config = STATUS_CONFIG[status];

          return (
            <div key={status} className="mt-6">
              {/* Section Header */}
              <div className={`mb-3 flex items-center gap-2 rounded-xl ${config.bg} px-4 py-2.5`}>
                <span className={`text-sm font-bold ${config.text}`}>
                  {config.label}
                </span>
                <span className={`badge ${config.bg} ${config.text} border ${config.border} text-[11px]`}>
                  {group.length}
                </span>
              </div>

              {/* Player Rows */}
              <div className="space-y-1.5">
                {group.map((player, playerIdx) => {
                  return (
                    <div
                      key={player.id}
                      className="card flex items-center gap-3 p-3.5 animate-slide-in"
                      style={{ animationDelay: `${(groupIdx * 0.05) + (playerIdx * 0.03)}s`, opacity: 0 }}
                    >
                      {/* Jersey Badge */}
                      {player.jersey_number !== null ? (
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm"
                          style={{ backgroundColor: team.theme_color_hex }}
                        >
                          {player.jersey_number}
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400">
                          —
                        </span>
                      )}

                      {/* Player Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{player.full_name}</p>
                      </div>

                      {/* Status Badge */}
                      <span className={`badge ${config.bg} ${config.text} border ${config.border} text-[11px]`}>
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Attendance Report */}
        {players && players.length > 0 && (
          <AttendanceReport
            players={players}
            attendanceMap={Object.fromEntries(attendanceMap)}
            teamName={team.name}
            practiceTitle={practice.title}
            practiceDate={formattedDate}
            teamColor={team.theme_color_hex}
          />
        )}

        {/* Empty State */}
        {(!players || players.length === 0) && (
          <div className="card mt-8 p-10 text-center animate-fade-in-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-700">אין שחקנים בקבוצה</p>
            <p className="mt-1.5 text-sm text-slate-400">הוסף שחקנים לקבוצה כדי לשלוח הזמנות</p>
          </div>
        )}
      </div>
    </div>
  );
}
