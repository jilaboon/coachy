import { createClient } from '@/lib/supabase-server';
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

  // Use RPC to fetch all invite data (bypasses RLS)
  const { data, error } = await supabase.rpc('get_invite_data', {
    invite_token: token,
  });

  if (error || !data) {
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

  const { invitation, player, practice, team } = data as {
    invitation: { id: string; response_status: string; token: string };
    player: { full_name: string };
    practice: { title: string; practice_date: string; start_time: string; end_time: string | null; location: string };
    team: { id: string; name: string; theme_color_name: string; theme_color_hex: string };
  };

  // Mark as opened
  await supabase.rpc('mark_invite_opened', { invite_token: token });

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
            token={token}
            currentStatus={invitation.response_status as 'yes' | 'no' | 'maybe' | 'no_response'}
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
