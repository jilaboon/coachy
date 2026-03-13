'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Team } from '@/types/database';

export default function TeamCard({ team, index }: { team: Team; index: number }) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  function handleClick() {
    setNavigating(true);
    router.push(`/teams/${team.id}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={navigating}
      className={`group block w-full text-right bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.96] transition-all duration-200 ${
        navigating ? 'opacity-70 scale-[0.98]' : ''
      }`}
      style={{
        '--team-primary': team.theme_color_hex,
        animationDelay: `${index * 60}ms`,
      } as React.CSSProperties}
    >
      <div className="flex items-center">
        {/* Colored left border */}
        <div
          className="w-1 self-stretch rounded-r-full"
          style={{ backgroundColor: team.theme_color_hex }}
        />
        <div className="flex items-center gap-3 px-4 py-4 flex-1 min-w-0">
          {/* Team logo or fallback */}
          {team.logo_url ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
              <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shrink-0 shadow-sm"
              style={{ backgroundColor: team.theme_color_hex }}
            >
              🏀
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base text-gray-900 truncate">{team.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{team.age_group}</p>
          </div>
          {navigating ? (
            <svg className="w-5 h-5 animate-spin text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors duration-200 rotate-180 shrink-0"
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
    </button>
  );
}
