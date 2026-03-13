'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Practice } from '@/types/database';

export default function PracticeCard({
  practice,
  teamColor,
  index,
}: {
  practice: Practice;
  teamColor: string;
  index: number;
}) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  function handleClick() {
    setNavigating(true);
    router.push(`/practices/${practice.id}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={navigating}
      className={`group block w-full text-right bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.96] transition-all duration-200 ${
        navigating ? 'opacity-70 scale-[0.98]' : ''
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex">
        {/* Team color accent */}
        <div
          className="w-1 self-stretch"
          style={{ backgroundColor: teamColor }}
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
            {navigating ? (
              <svg className="w-5 h-5 animate-spin text-gray-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors duration-200 rotate-180 shrink-0 mt-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
