import { Link } from 'wouter';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Airdrop Tracker</h1>
        <nav className="flex gap-3">
          <SignedOut>
            <Link href="/sign-in" className="text-sm px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500">
              Sign in
            </Link>
            <Link href="/sign-up" className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium">
              Sign up
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/user-portal" className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium">
              Open tracker
            </Link>
          </SignedIn>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
        <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold mb-4">
          Personal tracker — not a verification source
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Your private space for
          <br />
          airdrop opportunities
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-10">
          Record opportunities you find yourself, track deadlines and official links,
          and check off tasks. Your data stays private to your account — nothing is
          shared, and no wallet connection is ever requested.
        </p>
        <div className="flex gap-3 justify-center">
          <SignedOut>
            <Link href="/sign-up" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium">
              Get started free
            </Link>
            <Link href="/sign-in" className="px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500">
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/user-portal" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium">
              Open your tracker
            </Link>
          </SignedIn>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-20 text-left">
          {[
            ['Track deadlines', 'Calendar-aware deadlines with upcoming alerts so nothing slips.'],
            ['Task checklists', 'Per-project checklists you control — check off what you actually did.'],
            ['Private by design', 'Every record is scoped to your account. No public lists, no fabricated drops.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-semibold mb-2">{t}</h3>
              <p className="text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-600 mt-16 max-w-lg mx-auto">
          Airdrop Tracker is a personal record-keeping tool. It does not verify airdrops,
          predict rewards, or endorse any project. Always do your own research.
        </p>
      </main>
    </div>
  );
}
