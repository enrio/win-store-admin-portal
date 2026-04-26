# Shopee Connect API (Foundation)

This API set is the first implementation slice after store onboarding.

## Prerequisite

User must be onboarded into a store.

- Check with `GET /functions/v1/onboarding-store-me`
- If `initialized=false`, call `POST /functions/v1/onboarding-store-init-if-missing`

## Environment Variables

Required in Supabase Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`
- `SHOPEE_REDIRECT_URL`
- Optional: `SHOPEE_BASE_URL` (default: `https://partner.shopeemobile.com`)

## Endpoint: Create Shopee Auth Link

- Method: `POST`
- Path: `/functions/v1/shopee-auth-link`
- Auth: Bearer token

### Response

```json
{
  "success": true,
  "data": {
    "marketplace": "shopee",
    "auth_url": "https://partner.shopeemobile.com/api/v2/shop/auth_partner?...",
    "state": "base64-string",
    "store_id": "uuid",
    "store_slug": "my-store"
  }
}
```

### Errors

- `store_not_initialized` (409)
- `unauthorized` (401)
- `server_misconfigured` (500)

## Endpoint: Shopee OAuth Callback (Popup Bridge)

- Method: `GET`
- Path: `/functions/v1/shopee-oauth-callback`
- Query: `code`, `shop_id`, `main_account_id`, `state`, `error`
- Auth: none (public callback page)

Returns small HTML that sends:

```js
window.opener.postMessage(
  {
    source: "win-store-shopee-oauth",
    code,
    shopId,
    mainAccountId,
    state,
    error,
  },
  "*",
);
```

Then it closes the popup window.

## Endpoint: Exchange Code + Persist Connection

- Method: `POST`
- Path: `/functions/v1/shopee-exchange-code`
- Auth: Bearer token

### Request

```json
{
  "code": "oauth-code",
  "shopId": 123456789,
  "shopName": "My Shopee Shop"
}
```

or main-account grant:

```json
{
  "code": "oauth-code",
  "mainAccountId": 10208,
  "shopName": "Regional Main Account"
}
```

### Behavior

1. Validates user session.
2. Validates store onboarding status.
3. Calls Shopee `/api/v2/auth/token/get` with either `shop_id` or `main_account_id`.
4. Stores access/refresh token in Supabase Vault-backed secret references.
5. Upserts store-scoped Shopee connection record with grant subject type metadata.
6. If it was a main-account grant, returns `shop_id_list` and `merchant_id_list` so UI can continue with post-grant shop selection.

### Response

```json
{
  "success": true,
  "data": {
    "connection_id": "uuid",
    "store_id": "uuid",
    "marketplace": "shopee",
    "grant_subject_type": "main_account",
    "external_shop_id": "123456789",
    "main_account_id": "10208",
    "shop_id": null,
    "authorized_shop_ids": [33142, 46154],
    "authorized_merchant_ids": [1001705],
    "next_action": "select_authorized_shops_and_merchants_for_followup_token_materialization",
    "status": "connected",
    "expires_in": 14400,
    "refresh_expires_in": 2592000
  }
}
```

### Errors

- `code_required` (400)
- `grant_subject_required` (400)
- `grant_subject_conflict` (400)
- `store_not_initialized` (409)
- `store_access_denied` (403)
- `shopee_exchange_failed` (502)
- `connection_persist_failed` (500)

### Post-grant general flow

- Shop-account grant:
  - callback returns `shop_id`
  - `token/get` returns one shop-scoped token pair
  - connection is immediately ready for normal token-manager flow
- Main-account grant:
  - callback returns `main_account_id`
  - `token/get` may return multiple `shop_id_list` and `merchant_id_list`
  - backend stores the initial main-account grant and returns those lists to UI
  - next backend step is token materialization for each chosen shop or merchant

## Endpoint: Shopee Token Manager

- Method: `POST`
- Path: `/functions/v1/shopee-token-manager`
- Auth: Bearer token

### Request

```json
{
  "shopId": 123456789,
  "operation": "get"
}
```

`operation` supports:

- `get`: return token health; refresh only if near expiry (less than 5 minutes).
- `refresh`: force refresh now.

### Success Response

```json
{
  "success": true,
  "data": {
    "refreshed": true,
    "store_id": "uuid",
    "shop_id": "123456789",
    "connection_id": "uuid",
    "expires_in": 14400
  }
}
```

### Errors

- `shop_id_required` (400)
- `operation_invalid` (400)
- `shopee_connection_not_found` (404)
- `main_account_materialization_required` (409)
- `shopee_refresh_failed` (502)
- `token_rotate_failed` (500)
- `store_not_initialized` (409)

### Failure Policy

For every refresh failure, backend increments failure count. At 5 failures, connection is marked disabled and store status is set to inactive.

Main-account initial grants are excluded from the normal token-manager refresh loop until they are materialized into shop-specific or merchant-specific token records.

## Implemented Schema Objects

- `public.marketplace_connections`
- `public.marketplace_tokens`
- `public.marketplace_connection_status` (safe view)
- `public.upsert_marketplace_connection_with_tokens(...)`

Token strings are not returned by API and are stored as Vault secret references in database records.
