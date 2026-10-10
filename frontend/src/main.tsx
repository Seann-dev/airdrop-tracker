import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Redirect } from 'wouter';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Landing } from './pages/Landing';
import { SignInPage } from './pages/SignIn';
import { SignUpPage } from './pages/SignUp';
import { UserPortal } from './pages/UserPortal';
import './index.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedPortal() {
  return (
    <>
      <SignedIn>
        <UserPortal />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/user-portal" component={ProtectedPortal} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>
);
