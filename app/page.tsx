'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAudit(null);
    setError('');

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate audit');
      }

      setAudit(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6">
      <h1 className="text-4xl font-extrabold text-emerald-400 mt-10 mb-2">
        Landing Page UX & Conversion Auditor
      </h1>
      <p className="text-slate-400 mb-8">
        Paste your URL below to get a real, uncompromised AI-powered CRO audit.
      </p>

      <form onSubmit={handleAudit} className="flex w-full max-w-xl gap-2 mb-8">
        <input
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 px-4 py-3 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Auditing...' : 'Audit Page'}
        </button>
      </form>

      {error && (
        <div className="w-full max-w-xl bg-red-950/50 border border-red-800 p-4 rounded-lg text-red-200 mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {audit && (
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Audit Results</h2>
            <span className="text-lg font-bold bg-emerald-950 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-800">
              Score: {audit.overall_score}/100
            </span>
          </div>

          <div className="mb-4">
            <h3 className="text-red-400 font-semibold mb-2">Key Issues Identified</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
              {audit.key_issues?.map((issue: string, i: number) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-emerald-400 font-semibold mb-2">Actionable Recommendations</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
              {audit.recommendations?.map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}