'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { ResponseStatus } from '@/types/database';

interface InviteResponseProps {
  invitationId: string;
  currentStatus: ResponseStatus;
  isPast: boolean;
  teamColor: string;
}

const RESPONSE_OPTIONS: { status: ResponseStatus; label: string; emoji: string; bg: string; activeBg: string; ring: string }[] = [
  {
    status: 'yes',
    label: 'מגיע',
    emoji: '✅',
    bg: 'bg-green-50 text-green-700 border-green-200',
    activeBg: 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-200',
    ring: 'ring-green-300',
  },
  {
    status: 'no',
    label: 'לא מגיע',
    emoji: '❌',
    bg: 'bg-red-50 text-red-700 border-red-200',
    activeBg: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200',
    ring: 'ring-red-300',
  },
  {
    status: 'maybe',
    label: 'אולי',
    emoji: '🤔',
    bg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    activeBg: 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-200',
    ring: 'ring-yellow-300',
  },
];

export default function InviteResponse({
  invitationId,
  currentStatus,
  isPast,
  teamColor,
}: InviteResponseProps) {
  const [selected, setSelected] = useState<ResponseStatus>(currentStatus);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(currentStatus !== 'no_response');

  const handleResponse = async (status: ResponseStatus) => {
    if (isPast || submitting) return;

    setSubmitting(true);
    setSelected(status);

    const supabase = createClient();
    const { error } = await supabase
      .from('invitations')
      .update({
        response_status: status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    setSubmitting(false);

    if (!error) {
      setConfirmed(true);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        {RESPONSE_OPTIONS.map((option) => {
          const isSelected = selected === option.status && confirmed;
          return (
            <button
              key={option.status}
              onClick={() => handleResponse(option.status)}
              disabled={isPast || submitting}
              className={`flex items-center justify-center gap-3 rounded-2xl border-2 px-6 py-5 text-xl font-bold transition-all ${
                isSelected ? option.activeBg : option.bg
              } ${isPast ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.97]'}`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {confirmed && (
        <div className="mt-6 rounded-2xl p-4 text-center" style={{ backgroundColor: `${teamColor}10` }}>
          <p className="text-lg font-semibold" style={{ color: teamColor }}>
            {selected === 'yes' && 'תודה! נתראה באימון 🏀'}
            {selected === 'no' && 'תודה על העדכון'}
            {selected === 'maybe' && 'תודה! עדכן כשתדע 🙏'}
          </p>
          {!isPast && (
            <p className="mt-1 text-sm text-gray-500">
              ניתן לשנות את התשובה עד לתחילת האימון
            </p>
          )}
        </div>
      )}
    </div>
  );
}
