'use client';

import { useState } from 'react';

interface ShareButtonsProps {
  practiceLink: string;
  teamName: string;
  date: string;
  time: string;
  location: string;
}

export default function ShareButtons({
  practiceLink,
  teamName,
  date,
  time,
  location,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const message = `אימון ${teamName} 🏀
📅 ${date} בשעה ${time}
📍 ${location}

אשרו הגעה כאן:
${practiceLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(practiceLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = practiceLink;
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
    <div className="flex items-center gap-3">
      <button
        onClick={handleWhatsApp}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-green-600 active:bg-green-700"
      >
        <span className="text-xl">💬</span>
        <span>שתף בוואטסאפ</span>
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300"
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
    </div>
  );
}
