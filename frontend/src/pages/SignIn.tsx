import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome back</h1>
        <p className="text-sm text-slate-400 text-center mb-8">Sign in to your personal tracker</p>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-slate-900 border border-slate-800 shadow-none',
            },
          }}
          signUpUrl="/sign-up"
          afterSignInUrl="/user-portal"
        />
      </div>
    </div>
  );
}
