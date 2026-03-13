import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';

export default async function InviteRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up the invitation by token to find the practice_id
  const { data, error } = await supabase.rpc('get_invite_data', {
    invite_token: token,
  });

  if (error || !data) {
    notFound();
  }

  const { invitation } = data as {
    invitation: { id: string; practice_id?: string };
    player: { full_name: string };
    practice: { id: string };
  };

  const practiceId = data.practice?.id;
  if (!practiceId) {
    notFound();
  }

  redirect(`/p/${practiceId}`);
}
