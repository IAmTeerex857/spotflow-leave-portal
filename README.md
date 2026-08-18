# Spotflow Leave Portal

## Local Development

Copy `.env.example` to `.env.local`, fill in the credentials, then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Authentication

Set this environment variable in the Vercel Production environment:

```text
NEXT_PUBLIC_SITE_URL=https://spotflow-leave-portal.vercel.app
```

In Supabase, open **Authentication > URL Configuration** and configure:

- Site URL: `https://spotflow-leave-portal.vercel.app`
- Redirect URL: `https://spotflow-leave-portal.vercel.app/auth/callback`
- Local redirect URL: `http://localhost:3000/auth/callback`

Use exact production URLs rather than a wildcard. Supabase falls back to its Site URL when an OAuth callback is missing from the redirect allowlist.

In Google Cloud, the authorized redirect URI is Supabase's provider callback, not this application's callback:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

## Google Calendar Sync

Enable the Google Calendar API for the Google Cloud project used by Supabase Auth. Set the same OAuth client credentials in the application environment:

```text
GOOGLE_CLIENT_ID=<Google client ID configured in Supabase>
GOOGLE_CLIENT_SECRET=<Google client secret configured in Supabase>
```

Users must sign out and sign in again after calendar access is enabled. This grants the `calendar.events` scope, stores the refresh token, and backfills their existing approved leave as all-day events. New approvals are synchronized immediately and repeated syncs update the same events instead of creating duplicates.
