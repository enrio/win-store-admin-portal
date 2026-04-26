# Supabase-Based OAuth Token Management API

(for Shopee Open API – Multi-Pod Safe, Actor-Model Token Refresh)

**Project Goal**  
Build a secure, scalable, Supabase-native integration layer that handles OAuth token lifecycle (access_token + single-use refresh_token) for external APIs (primarily Shopee Open API), while solving these core problems:

- Multiple concurrent API calls can trigger refresh at the same time → race condition → refresh_token invalidation (Shopee refresh is single-use)
- Deployment on multiple Docker containers / Kubernetes pods → no shared memory → token refresh in one pod must be visible to others
- Need strict serialization per shop → only one refresh operation at a time per `(provider, shop_id)`
- Track repeated refresh failures and disable shop after threshold (status = 5)

**Current Date (context)**: March 17, 2026

## 1. Conversation Summary – Evolution of Requirements

| Version   | Key Changes / Decisions | Lock Scope                 | Failed Refresh Handling                                    | Other Notes                         |
| --------- | ----------------------- | -------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| v1        | Initial design          | `user_id:provider:shop_id` | None                                                       | Full actor model with advisory lock |
| v2        | Lock key changed        | `provider__shop_id`        | Add `refresh_failed_count`, disable shop after ≥5 failures | No lock on `win_store.shop` table   |
| (current) | Document + full context | `provider__shop_id`        | Same as v2                                                 | Ready for implementation / review   |

**Core invariants that never changed**:

- Use **Supabase Edge Functions** + **Postgres** as central coordinator
- Use **PostgreSQL advisory transaction locks** (`pg_advisory_xact_lock`) → true actor-model behavior across pods
- Shopee refresh_token is **single-use** → must guarantee exactly one refresh per expiration cycle
- All token logic must live in **Edge Functions** (never client-side)
- OAuth flow uses popup + `window.postMessage` to send code back to main window
- Proxy layer should transparently handle token refresh on 401

## 2. Final Database Schema (as of latest version)

```sql
CREATE TABLE external_tokens (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider              TEXT NOT NULL DEFAULT 'shopee',
    shop_id               BIGINT,                               -- NULL = merchant-level auth
    merchant_id           BIGINT,
    access_token          TEXT NOT NULL,
    refresh_token         TEXT NOT NULL,
    expires_at            TIMESTAMPTZ NOT NULL,
    refresh_failed_count  INTEGER NOT NULL DEFAULT 0,
    last_refresh_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    version               INTEGER NOT NULL DEFAULT 1,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE external_tokens ADD CONSTRAINT unique_connection
    UNIQUE (user_id, provider, COALESCE(shop_id, 0), COALESCE(merchant_id, 0));

CREATE INDEX idx_tokens_user_provider     ON external_tokens(user_id, provider, shop_id);
CREATE INDEX idx_external_tokens_failed    ON external_tokens (provider, shop_id)
    WHERE refresh_failed_count >= 5;
```

**Related table (business logic)**

```sql
-- assumed schema (adjust column names if needed)
TABLE win_store.shop (
    shop_id     BIGINT PRIMARY KEY,
    status      INTEGER NOT NULL DEFAULT 1,    -- 5 = token_expired / disabled
    note        TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    ...
)
```

## 3. Final Actor Lock Logic

```ts
function getActorLockId(
  provider: string,
  shopId: number | string | null,
): number {
  const effectiveShopId = shopId ?? 0;
  const key = `${provider.toLowerCase()}__${effectiveShopId}`;
  const hash = crypto.createHash("md5").update(key).digest("hex");
  return Number(BigInt(`0x${hash.slice(0, 15)}`) % BigInt(2147483647));
}
```

→ deterministic, collision-safe 31-bit lock key  
→ same string key → same lock across all pods

## 4. Core Logic – getValidToken (Actor)

```ts
async function getValidToken(provider: string, shopId: number | null) {
  const lockId = getActorLockId(provider, shopId);
  const pg = new Client(Deno.env.get("SUPABASE_DB_URL")!);

  await pg.connect();
  try {
    await pg.query("BEGIN");
    await pg.query("SELECT pg_advisory_xact_lock($1)", [lockId]);

    // Fetch + lock row
    const row = await fetchTokenRow(pg, provider, shopId);
    if (!row) throw new Error("Token not found");

    if (isTokenNearExpiry(row.expires_at)) {
      try {
        const newTokens = await callShopeeRefresh(row.refresh_token, shopId);
        await updateTokenSuccess(pg, row.id, newTokens);
        row.access_token = newTokens.access_token;
        // reset count implicitly via UPDATE
      } catch (e) {
        const newCount = row.refresh_failed_count + 1;
        await updateFailedCount(pg, row.id, newCount);

        if (newCount >= 5) {
          await pg.query("COMMIT"); // release actor lock FIRST
          await markShopAsExpired(shopId); // separate short tx – no lock contention
          throw new Error(`Shop ${shopId} disabled after 5 failed refreshes`);
        }
      }
    }

    await pg.query("COMMIT");
    return row.access_token;
  } catch (e) {
    await pg.query("ROLLBACK");
    throw e;
  } finally {
    await pg.end();
  }
}
```

**Important properties**:

- Long transaction only holds advisory lock + row `FOR UPDATE`
- Shop status update happens **after COMMIT** → minimal contention
- No lock is ever taken on `win_store.shop`

## 5. OAuth Flow Recap (generalized per latest Shopee doc)

1. UI → Edge Function → generate Shopee auth URL.
2. Seller authorizes with either:

- shop account: one shop grant.
- main account: one grant that may cover multiple shops and merchants.

3. Popup → Shopee → redirect to callback with:

- `code + shop_id` for shop-account authorization, or
- `code + main_account_id` for main-account authorization.

4. Callback page → `window.opener.postMessage(...)` with both possible identifiers.
5. Main window → Edge Function `exchange-code`.
6. `token/get` is called with either `shop_id` or `main_account_id`.
7. If the grant subject is a main account, Shopee may return `shop_id_list` and `merchant_id_list`.
8. Backend stores the initial grant plus the authorized shop/merchant lists.
9. Follow-up step after a main-account grant:

- UI lets the user confirm/select which authorized shops or merchants to activate.
- Backend materializes per-shop or per-merchant token records for the long-term refresh loop.

10. Long-term token refresh remains serialized per concrete `shop_id` or `merchant_id`, not per initial `main_account_id` grant.

### Important main-account note from Shopee

- The first `token/get` response for `main_account_id` can cover multiple `shop_id` and `merchant_id` values.
- The initial access token and refresh token are shared across those authorized subjects.
- After refresh, tokens become independent per `shop_id` or `merchant_id` and must then be stored separately.

## 6. Next Steps & Open Questions (for implementation)

- [ ] Create full set of Edge Functions (file-based structure suggestion below)
- [ ] Decide on token encryption strategy (Vault / pgsodium / manual AES)
- [ ] Add timeout / circuit-breaker for very long lock waits
- [ ] Define exact Shopee refresh request signing logic (usually missing in early prototypes)
- [ ] Add logging/monitoring (Supabase Logs + optional Sentry)
- [ ] Decide retry strategy for non-auth refresh failures (network, 429, etc.)

**Suggested Edge Function structure**

```
supabase/functions/
├── get-auth-link/
├── exchange-code/
├── token-manager/          ← core actor (can be called directly or from proxy)
├── proxy-shopee-api/
└── force-reconnect/        ← optional: reset count + clear tokens
```

If anything is unclear, missing, or you want to change priorities / add features (webhook support, multi-provider config table, rate limiting, etc.), just tell me and we continue from this clean baseline document.

Ready to start coding the actual Edge Functions? Or want refinements first?
