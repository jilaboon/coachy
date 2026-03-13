'use client';

import type { Player } from '@/types/database';

interface AttendanceReportProps {
  players: Player[];
  attendanceMap: Record<string, boolean>;
  teamName: string;
  coachName: string;
  practiceTitle: string;
  practiceDate: string;
  teamColor: string;
}

export default function AttendanceReport({
  players,
  attendanceMap,
  teamName,
  coachName,
  practiceTitle,
  practiceDate,
  teamColor,
}: AttendanceReportProps) {
  const attended = players.filter((p) => attendanceMap[p.id]);
  const absent = players.filter((p) => !attendanceMap[p.id]);
  const hasAnyMarked = Object.values(attendanceMap).some((v) => v === true);

  function buildWhatsAppText() {
    let text = `📋 דוח נוכחות — ${teamName}\n`;
    text += `${practiceTitle} | ${practiceDate}\n`;
    if (coachName) text += `מאמן: ${coachName}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;

    if (attended.length > 0) {
      text += `✅ נוכחים (${attended.length}):\n`;
      attended.forEach((p, i) => {
        text += `${i + 1}. ${p.full_name}`;
        if (p.phone) text += ` — ${p.phone}`;
        text += `\n`;
      });
    }

    if (absent.length > 0) {
      text += `\n❌ חסרים (${absent.length}):\n`;
      absent.forEach((p, i) => {
        text += `${i + 1}. ${p.full_name}\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━━━━\n`;
    text += `סה״כ: ${attended.length}/${players.length} נוכחים`;

    return text;
  }

  function shareViaWhatsApp() {
    const text = buildWhatsAppText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function copyReport() {
    const text = buildWhatsAppText();
    navigator.clipboard.writeText(text);
  }

  if (!hasAnyMarked) return null;

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-900">דוח נוכחות</h2>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: teamColor }}
        >
          {attended.length}/{players.length}
        </span>
      </div>

      {/* Screenshot-friendly table */}
      <div className="card overflow-hidden" id="attendance-report">
        {/* Report Header */}
        <div
          className="px-4 py-3 text-white text-center"
          style={{ backgroundColor: teamColor }}
        >
          <p className="text-sm font-bold">{teamName}</p>
          <p className="text-xs text-white/80 mt-0.5">{practiceTitle} — {practiceDate}</p>
          {coachName && <p className="text-xs text-white/70 mt-0.5">מאמן: {coachName}</p>}
        </div>

        {/* Attended Players */}
        {attended.length > 0 && (
          <>
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
              <span className="text-xs font-bold text-emerald-700">✅ נוכחים ({attended.length})</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-right py-2 px-4 font-semibold">#</th>
                  <th className="text-right py-2 px-4 font-semibold">שם</th>
                  <th className="text-right py-2 px-4 font-semibold">טלפון</th>
                </tr>
              </thead>
              <tbody>
                {attended.map((player, idx) => (
                  <tr
                    key={player.id}
                    className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}
                  >
                    <td className="py-2.5 px-4 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{player.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-xs" dir="ltr">{player.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Absent Players */}
        {absent.length > 0 && (
          <>
            <div className="px-4 py-2 bg-red-50 border-t border-b border-red-100">
              <span className="text-xs font-bold text-red-700">❌ חסרים ({absent.length})</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {absent.map((player, idx) => (
                  <tr
                    key={player.id}
                    className={`opacity-60 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="py-2 px-4 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2 px-4 text-slate-500">{player.full_name}</td>
                    <td className="py-2 px-4 text-slate-400 font-mono text-xs" dir="ltr">{player.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Summary Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <span className="text-xs font-bold text-slate-500">
            סה״כ: {attended.length} מתוך {players.length} נוכחים
          </span>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={shareViaWhatsApp}
          className="btn flex-1 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#20bd5a] active:scale-[0.97]"
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          שלח בוואטסאפ
        </button>
        <button
          onClick={copyReport}
          className="btn btn-secondary rounded-xl py-3 px-4 text-sm font-bold active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          העתק
        </button>
      </div>
    </div>
  );
}
