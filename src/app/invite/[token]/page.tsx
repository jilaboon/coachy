import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import type { Invitation, Practice, Team, Player } from '@/types/database';
import InviteResponse from './InviteResponse';

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

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single<Invitation>();

  if (invError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">הקישור לא נמצא</h1>
          <p className="mt-2 text-gray-500">
            ייתכן שהקישור שגוי או שפג תוקפו
          </p>
        </div>
      </div>
    );
  }

  // Update last_opened_at
  await supabase
    .from('invitations')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Fetch practice
  const { data: practice } = await supabase
    .from('practices')
    .select('*')
    .eq('id', invitation.practice_id)
    .single<Practice>();

  if (!practice) notFound();

  // Fetch team
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', practice.team_id)
    .single<Team>();

  if (!team) notFound();

  // Fetch player
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', invitation.player_id)
    .single<Player>();

  if (!player) notFound();

  // Check if practice start time has passed
  const practiceDateTime = new Date(`${practice.practice_date}T${practice.start_time}`);
  const isPast = practiceDateTime < new Date();

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ '--team-primary': team.theme_color_hex } as React.CSSProperties}
    >
      {/* Team Header */}
      <div
        className="px-4 pb-12 pt-8 text-center text-white"
        style={{ backgroundColor: team.theme_color_hex }}
      >
        <p className="text-sm text-white/80">{team.name}</p>
        <h1 className="mt-2 text-2xl font-bold">{practice.title}</h1>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Practice Details Card */}
        <div className="-mt-6 rounded-2xl bg-white p-6 shadow-lg">
          <div className="space-y-4 text-center">
            <div>
              <span className="text-sm text-gray-500">תאריך</span>
              <p className="text-lg font-semibold">{formatDate(practice.practice_date)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">שעה</span>
              <p className="text-lg font-semibold">
                {formatTime(practice.start_time)}
                {practice.end_time && ` - ${formatTime(practice.end_time)}`}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">מיקום</span>
              <p className="text-lg font-semibold">{practice.location}</p>
            </div>
          </div>
        </div>

        {/* Greeting & Response */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-center text-xl font-bold text-gray-900">
            שלום {player.full_name} 👋
          </p>
          <p className="mt-3 text-center text-lg text-gray-600">
            האם תגיע לאימון?
          </p>

          <InviteResponse
            invitationId={invitation.id}
            currentStatus={invitation.response_status}
            isPast={isPast}
            teamColor={team.theme_color_hex}
          />
        </div>

        {isPast && (
          <p className="mt-4 text-center text-sm text-gray-400">
            האימון כבר התקיים - לא ניתן לשנות תשובה
          </p>
        )}
      </div>
    </div>
  );
}
