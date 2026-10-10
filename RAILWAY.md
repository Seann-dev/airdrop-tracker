# Railway environment variables needed:
#
#   DATABASE_URL            — auto-provided when you add a PostgreSQL service
#                             and reference it (e.g. ${{Postgres.DATABASE_URL}})
#   CLERK_SECRET_KEY        — from your Clerk dashboard (server-side only!)
#   CLERK_PUBLISHABLE_KEY   — from your Clerk dashboard (also set as
#                             VITE_CLERK_PUBLISHABLE_KEY build arg, see below)
#
# Build args (Railway service → Settings → Build):
#   VITE_CLERK_PUBLISHABLE_KEY=${{shared.VITE_CLERK_PUBLISHABLE_KEY}}
#   (or paste the pk_test_... value directly as the build arg)
#
# Steps on Railway:
#   1. Add a PostgreSQL service to the project.
#   2. In this service → Variables, add:
#        DATABASE_URL=${{Postgres.DATABASE_URL}}
#        CLERK_SECRET_KEY=<your sk_test_... / sk_live_...>
#        CLERK_PUBLISHABLE_KEY=<your pk_test_... / pk_live_...>
#   3. In this service → Settings → Build, add build arg:
#        VITE_CLERK_PUBLISHABLE_KEY=<your pk_test_... / pk_live_...>
#   4. Generate a domain under Networking.
#   5. Run DB migration once: `npx drizzle-kit migrate` with DATABASE_URL set,
#      or execute the SQL in drizzle/ against the Railway Postgres.
