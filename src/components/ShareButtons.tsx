'use client';

import { useState } from 'react';

interface ShareButtonsProps {
  playerName: string;
  teamName: string;
  date: string;
  time: string;
  inviteUrl: string;
}

export default function ShareButtons({
  playerName,
  teamName,
  date,
  time,
  inviteUrl,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const message = `שלום ${playerName},
נא לאשר הגעה לאימון של ${teamName}
בתאריך ${date} בשעה ${time}

אישור הגעה כאן:
${inviteUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300"
      >
        {copied ? (
          <>
            <span>✓</span>
            <span>הועתק!</span>
          </>
        ) : (
          <>
            <span>📋</span>
            <span>העתק קישור</span>
          </>
        )}
      </button>
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 active:bg-green-700"
      >
        <span>💬</span>
        <span>שתף בוואטסאפ</span>
      </button>
    </div>
  );
}
