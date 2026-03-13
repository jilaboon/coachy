'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RefreshButton({ teamColor }: { teamColor: string }) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 1000);
  }

  return (
    <button
      onClick={handleRefresh}
      className="btn w-full rounded-2xl py-3.5 text-base font-bold text-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
      style={{ backgroundColor: teamColor }}
    >
      <svg
        className={`h-5 w-5 transition-transform duration-700 ${spinning ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" />
      </svg>
      רענן תשובות
    </button>
  );
}
