import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Create your tracker</h1>
        <p className="text-sm text-slate-400 text-center mb-8">Email + password, with verification by Clerk</p>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-slate-900 border border-slate-800 shadow-none',
            },
          }}
          signInUrl="/sign-in"
          afterSignUpUrl="/user-portal"
        />
      </div>
    </div>
  );
}
