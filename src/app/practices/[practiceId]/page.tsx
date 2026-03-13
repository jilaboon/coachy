import { createClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { Practice, Team, Player, Invitation, ResponseStatus } from '@/types/database';
import ShareButtons from '@/components/ShareButtons';

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

const STATUS_CONFIG: Record<ResponseStatus, { label: string; bg: string; text: string; border: string }> = {
  yes: { label: 'מגיעים', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  no: { label: 'לא מגיעים', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  maybe: { label: 'אולי', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  no_response: { label: 'טרם ענו', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
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

  const invitationMap = new Map<string, Invitation>();
  (invitations ?? []).forEach((inv) => invitationMap.set(inv.player_id, inv));

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
      className="min-h-screen bg-gray-50 pb-8"
      style={{ '--team-primary': team.theme_color_hex } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="px-4 py-6 text-white"
        style={{ backgroundColor: team.theme_color_hex }}
      >
        <div className="mx-auto max-w-lg">
          <Link
            href="/dashboard"
            className="mb-3 inline-block text-sm text-white/80 hover:text-white"
          >
            → חזרה ללוח הבקרה
          </Link>
          <h1 className="text-2xl font-bold">{practice.title}</h1>
          <p className="mt-1 text-white/90">{team.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Practice Details */}
        <div className="-mt-4 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">תאריך</span>
              <p className="mt-1 font-medium">{formattedDate}</p>
            </div>
            <div>
              <span className="text-gray-500">שעה</span>
              <p className="mt-1 font-medium">
                {formattedTime}
                {practice.end_time && ` - ${formatTime(practice.end_time)}`}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">מיקום</span>
              <p className="mt-1 font-medium">{practice.location}</p>
            </div>
            {practice.notes && (
              <div className="col-span-2">
                <span className="text-gray-500">הערות</span>
                <p className="mt-1 text-gray-700">{practice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <Link
            href={`/practices/${practiceId}/attendance`}
            className="flex-1 rounded-xl bg-white py-3 text-center text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
            style={{ color: team.theme_color_hex }}
          >
            סימון נוכחות בפועל
          </Link>
        </div>

        {/* Response Counters */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {statusOrder.map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className={`rounded-xl border ${config.border} ${config.bg} p-3 text-center`}
              >
                <p className={`text-2xl font-bold ${config.text}`}>
                  {grouped[status].length}
                </p>
                <p className={`mt-1 text-xs ${config.text}`}>{config.label}</p>
              </div>
            );
          })}
        </div>

        {/* Player Lists by Status */}
        {statusOrder.map((status) => {
          const group = grouped[status];
          if (group.length === 0) return null;
          const config = STATUS_CONFIG[status];

          return (
            <div key={status} className="mt-6">
              <h2 className={`mb-3 text-sm font-bold ${config.text}`}>
                {config.label} ({group.length})
              </h2>
              <div className="space-y-2">
                {group.map((player) => {
                  const inv = player.invitation;
                  const inviteUrl = inv
                    ? `${BASE_URL}/invite/${inv.token}`
                    : '';

                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {player.jersey_number !== null && (
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ backgroundColor: team.theme_color_hex }}
                          >
                            {player.jersey_number}
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{player.full_name}</p>
                          <span
                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
                          >
                            {config.label}
                          </span>
                        </div>
                      </div>
                      {inv && (
                        <ShareButtons
                          playerName={player.full_name}
                          teamName={team.name}
                          date={formattedDate}
                          time={formattedTime}
                          inviteUrl={inviteUrl}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {(!players || players.length === 0) && (
          <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
            <p className="text-lg">אין שחקנים בקבוצה</p>
            <p className="mt-2 text-sm">הוסף שחקנים לקבוצה כדי לשלוח הזמנות</p>
          </div>
        )}
      </div>
    </div>
  );
}
