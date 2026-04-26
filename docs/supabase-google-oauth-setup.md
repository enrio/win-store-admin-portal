# Supabase & Google OAuth Setup Guide

## 1. Get Supabase Credentials

### Local (Supabase CLI)

```bash
supabase start
```

After starting, the CLI prints your local credentials:

| Key | Value |
|-----|-------|
| `API URL` | `http://127.0.0.1:54321` |
| `anon key` | (printed in terminal) |

### Production (Supabase Cloud)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project → **Settings** → **API**
3. Copy **Project URL** and **anon / public** key

## 2. Configure `.env` Files

```bash
# Copy the template
cp .env.example .env
cp .env.example .env.production
```

Edit `.env` **(local dev)**:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
```

Edit `.env.production` **(production)**:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-production-anon-key>
```

> **Note:** Vite auto-loads `.env` for `dev` and `.env.production` for `build`.

## 3. Google OAuth Setup

### 3a. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:

| Environment | Redirect URI |
|-------------|-------------|
| Local | `http://127.0.0.1:54321/auth/v1/callback` |
| Production | `https://<project-ref>.supabase.co/auth/v1/callback` |

7. Copy the **Client ID** and **Client Secret**

### 3b. Enable in Supabase

#### Local (via `config.toml`)

In your Supabase project's `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "your-google-client-id"
secret = "your-google-client-secret"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
```

Then restart:

```bash
supabase stop && supabase start
```

#### Production (via Dashboard)

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Google**
3. Paste **Client ID** and **Client Secret**
4. Save

### 3c. Redirect URL Config

In Supabase Dashboard → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `http://localhost:5173` (local) or your production URL |
| Redirect URLs | `http://localhost:5173`, `https://your-domain.com` |

For local, also add in `config.toml`:

```toml
[auth]
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173"]
```

## 4. Verify Setup

```bash
pnpm run dev
```

1. Open `http://localhost:5173/login`
2. Try **Sign in with Google** → should redirect to Google → back to app
3. A new user will see the **store onboarding form**
4. After creating a store, you'll land on the dashboard
