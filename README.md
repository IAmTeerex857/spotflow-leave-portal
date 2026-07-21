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
NEXT_PUBLIC_SITE_URL=https://leave-app.spotflow.co
```

In Supabase, open **Authentication > URL Configuration** and configure:

- Site URL: `https://leave-app.spotflow.co`
- Redirect URL: `https://leave-app.spotflow.co/auth/callback`
- Local redirect URL: `http://localhost:3000/auth/callback`
- Vercel redirect URL, if the Vercel domain is used directly: `https://spotflow-leave-portal.vercel.app/auth/callback`

Use exact production URLs rather than a wildcard. Supabase falls back to its Site URL when an OAuth callback is missing from the redirect allowlist.

In Google Cloud, the authorized redirect URI is Supabase's provider callback, not this application's callback:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```
