'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      if (error.message.includes('Invalid login credentials')) {
        setError('אימייל או סיסמה שגויים');
      } else if (error.message.includes('Email not confirmed')) {
        setError('האימייל לא אומת עדיין');
      } else {
        setError('שגיאה בהתחברות, נסה שוב');
      }
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#f8f9fb] via-white to-[#f0f4ff]">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-in">🏀</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Coachy
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm font-medium">
            ניהול נוכחות לאימונים
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="card p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-600 mb-1.5"
            >
              אימייל
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="coach@example.com"
              dir="ltr"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-600 mb-1.5"
            >
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="animate-error flex items-center gap-2 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border-r-4 border-red-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary w-full py-3 text-sm ${loading ? 'btn-loading' : ''}`}
          >
            {loading && (
              <svg className="btn-spinner w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {loading ? 'מתחבר...' : 'התחברות'}
          </button>
        </form>

        {/* Signup link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          אין לך חשבון?{' '}
          <Link
            href="/login/signup"
            className="text-primary font-semibold hover:underline underline-offset-2 transition-colors"
          >
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
}
