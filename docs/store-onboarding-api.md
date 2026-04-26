# Store Onboarding Flow Refactor

**Date**: March 18, 2026  
**Status**: Implemented  
**Impact**: Backend API change - requires UI update in admin portal and storefront

---

## Summary

The store onboarding flow has been refactored from **automatic initialization** (via Supabase Edge Functions) to **explicit user-driven flow** (via UI form with PostgREST/RPC calls).

### What Changed

| Aspect             | Before                                                    | After                               |
| ------------------ | --------------------------------------------------------- | ----------------------------------- |
| **Flow**           | Auto-create store on first login                          | User submits form → creates store   |
| **Edge Functions** | 2 functions (init, context reader)                        | Removed (no longer needed)          |
| **SQL RPCs**       | 2 functions (get_my_store_context, init_store_if_missing) | 2 new functions (better separation) |
| **Data Provider**  | Custom logic in functions                                 | Refine @supabase compatible         |

---

## Removed Components

### Edge Functions (Deleted)

- `supabase/functions/onboarding-store-init-if-missing/`
- `supabase/functions/onboarding-store-me/`

These were REST endpoints that wrapped SQL logic. Now UI calls RPC directly via `@supabase/supabase-js`.

### SQL RPC Functions (Dropped)

- `public.get_my_store_context()` — Single store context (JSONB response)
- `public.init_store_if_missing(name, slug, email, phone, address)` — Create store if user has none

Both had issues:

- JSONB response format required custom parsing
- Auto-creation logic was implicit, hard to debug
- Couldn't integrate cleanly with Refine's data provider

---

## New API

### RPC 1: `store_get_user_stores()`

**Purpose**: Fetch all stores the current user is a member of

**Signature**

```sql
store_get_user_stores()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  business_email text,
  phone text,
  address jsonb,
  status text,
  owner_user_id uuid,
  role text,
  created_at timestamptz
)
```

**Security**: `SECURITY INVOKER` + RLS filters via `auth.uid()`

**Request (Supabase Client)**

```typescript
// Using @supabase/supabase-js
const { data, error } = await supabase.rpc("store_get_user_stores");

if (error) {
  console.error("Failed to fetch stores:", error.message);
} else {
  console.log("User stores:", data);
  // data is now an array of store objects (flat structure, Refine-compatible)
}
```

**Response Example**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Shop",
    "slug": "my-shop",
    "business_email": "shop@example.com",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "zip": "94103"
    },
    "status": "active",
    "owner_user_id": "550e8400-e29b-41d4-a716-446655440001",
    "role": "owner",
    "created_at": "2026-03-18T12:00:00Z"
  }
]
```

**Error Cases**

- `401 Unauthorized`: No valid authentication token
- `null` response: User is authenticated but has no stores (expected for new users)

---

### RPC 2: `create_store_with_membership()`

**Purpose**: Create a new store and auto-add user as owner (atomic transaction)

**Signature**

```sql
create_store_with_membership(
  p_name text,
  p_slug text,
  p_business_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  same structure as store_get_user_stores()
)
```

**Security**: `SECURITY INVOKER` + validates inputs + prevents slug duplicates

**Input Validation**

- `p_name`: Required, 1–255 characters, trimmed
- `p_slug`: Required, lowercase alphanumeric + hyphens, 1–63 characters, must be unique
  - Pattern: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` (no leading/trailing hyphens)
  - Examples: `my-shop`, `shop-123`, `a` (valid); `-my-shop`, `my-shop-`, `MY-SHOP` (invalid)
- `p_business_email`: Optional, trimmed, null if empty
- `p_phone`: Optional, trimmed, null if empty
- `p_address`: Optional, JSON object, defaults to `{}`

**Request (Supabase Client)**

```typescript
const { data: newStore, error } = await supabase.rpc(
  "create_store_with_membership",
  {
    p_name: "My Shop",
    p_slug: "my-shop",
    p_business_email: "shop@example.com",
    p_phone: "+1234567890",
    p_address: {
      street: "123 Main St",
      city: "San Francisco",
      zip: "94103",
    },
  },
);

if (error) {
  console.error("Failed to create store:", error.message);
} else {
  console.log("Store created:", newStore[0]); // Returns array with single object
}
```

**Response Example** (Same structure as `store_get_user_stores()`)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Shop",
    "slug": "my-shop",
    "business_email": "shop@example.com",
    "phone": "+1234567890",
    "address": {
      /* ... */
    },
    "status": "active",
    "owner_user_id": "550e8400-e29b-41d4-a716-446655440001",
    "role": "owner",
    "created_at": "2026-03-18T12:00:00Z"
  }
]
```

**Error Cases**

- `400 Invalid input: Store name is required` — name is blank
- `400 Invalid input: Store name must be 255 characters or less` — name too long
- `400 Invalid input: Store slug is required` — slug is blank
- `400 Invalid input: Store slug format invalid` — slug contains spaces, uppercase, or special chars
- `400 Invalid input: Store slug must be 63 characters or less` — slug too long
- `409 Conflict: Store slug already in use` — duplicate slug (another user or store already using it)
- `401 Unauthorized` — no valid authentication token

---

## UI Integration Pattern

### Using Refine Framework + @refinedev/supabase

```typescript
// pages/stores/list.tsx
import { useList, useCreate } from '@refinedev/core';

export const StoreListPage = () => {
  // Fetch user's stores
  const { data: storesData, isLoading, error } = useList({
    resource: 'stores',
    queryOptions: {
      queryFn: async () => {
        const { data, error } = await supabase.rpc('store_get_user_stores');
        if (error) throw error;
        return { data: data || [], total: data?.length || 0 };
      }
    }
  });

  // Create new store
  const { mutate: createStore } = useCreate();

  const handleCreateStore = (formData) => {
    createStore(
      {
        resource: 'stores',
        values: {
          p_name: formData.name,
          p_slug: formData.slug,
          p_business_email: formData.email,
          p_phone: formData.phone,
          p_address: formData.address
        },
        queryOptions: {
          queryFn: async (values) => {
            const { data, error } = await supabase.rpc(
              'create_store_with_membership',
              values
            );
            if (error) throw error;
            return data?.[0]; // Return single object
          }
        }
      },
      {
        onSuccess: () => {
          // Refresh stores list
          // Redirect to store dashboard
        }
      }
    );
  };

  // Show onboarding if no stores
  if (storesData?.data.length === 0) {
    return <OnboardingForm onSubmit={handleCreateStore} />;
  }

  return (
    <div>
      <h1>Your Stores</h1>
      {/* List stores & provide option to create new one */}
    </div>
  );
};
```

### Direct Client Usage (Supabase SDK)

```typescript
// If not using Refine, or for standalone utilities

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, anonKey);

// Get stores
async function getUserStores() {
  const { data, error } = await supabase.rpc("store_get_user_stores");
  if (error) throw error;
  return data; // Array of stores
}

// Create store
async function createNewStore(formData) {
  const { data, error } = await supabase.rpc("create_store_with_membership", {
    p_name: formData.name,
    p_slug: formData.slug,
    p_business_email: formData.email,
    p_phone: formData.phone,
    p_address: formData.address,
  });

  if (error) throw error;
  return data[0]; // Single store object
}
```

---

## UI Flow (Step-by-Step)

### On App Load / Dashboard Access

```
1. Check auth: Is user logged in?
   ├─ No → Redirect to login
   └─ Yes → Continue

2. Fetch: Call store_get_user_stores()
   ├─ Error → Show error message
   ├─ Empty array → Show Onboarding
   └─ Has stores → Show Store Selector / Dashboard
```

### Onboarding Flow (First-Time User)

```
3. Show Onboarding Form with fields:
   ├─ Store Name (required, 1-255 chars)
   ├─ Store Slug (required, pattern validation)
   ├─ Business Email (optional)
   ├─ Phone (optional)
   └─ Address (optional, JSON)

4. User fills form and submits

5. Validate client-side:
   ├─ Name: Not empty, ≤ 255 chars
   ├─ Slug: Matches pattern ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
   └─ Slug: ≤ 63 chars

6. Call create_store_with_membership(...)

7. Handle response:
   ├─ Success → Redirect to store dashboard
   └─ Error → Show error message (provide suggestions for each error type)
```

### Store Management (Existing Users)

```
After first store is created, user sees:
- List of their stores (from store_get_user_stores)
- Option to create additional store
- Option to manage store (edit, add members, etc.)
```

---

## Data Security (RLS)

### How RLS Works

**Tables**: `stores`, `store_memberships`  
**Policy**: User can see/modify only stores they're a member of

```sql
-- stores.select_member policy
SELECT allowed IF:
  EXISTS (
    SELECT 1 FROM store_memberships sm
    WHERE sm.store_id = stores.id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
  )

-- store_memberships.select_same_store policy
SELECT allowed IF:
  Querying user is a member of the same store
```

### What This Means

✅ User Alice can fetch stores where is_active = true and membership exists
✅ User Alice can see other members of her stores
❌ User Alice cannot see Bob's stores
❌ User Alice cannot create a store membership without being an owner/admin

---

## Migration Notes

### For Developers

1. **Apply migrations**:

   ```bash
   supabase migration list          # See new migrations
   supabase db reset                # Apply to local DB
   supabase gen types typescript    # Update TypeScript types
   ```

2. **Update TypeScript types** (auto-generated):

   ```typescript
   // supabase/generated/types.ts
   export type Tables['stores'] = {
     id: string;
     name: string;
     slug: string;
     business_email: string | null;
     phone: string | null;
     address: Json;
     status: 'active' | 'inactive' | 'suspended';
     owner_user_id: string;
     created_at: string;
     updated_at: string;
   };
   ```

3. **Test RPC locally**:
   ```typescript
   // In local dev environment
   const { data } = await supabase.rpc("store_get_user_stores");
   console.log(data); // Should return empty array for new user
   ```

### Old Endpoint Mapping

If you're migrating old code:

| Old Pattern                                           | New Approach                                               |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `POST /functions/v1/onboarding-store-init-if-missing` | `supabase.rpc('create_store_with_membership', {...})`      |
| `GET /functions/v1/onboarding-store-me`               | `supabase.rpc('store_get_user_stores')`                    |
| Check if initialized: `get_my_store_context()`        | Check array length: `store_get_user_stores().length === 0` |

---

## FAQ

**Q: Can a user have multiple stores?**  
A: Yes. `store_get_user_stores()` returns all stores user is a member of.

**Q: What if slug is taken?**  
A: Get `409 Conflict` error. User must choose a different slug. Make sure UI suggests variations.

**Q: Can I update store details after creation?**  
A: Yes, use PostgREST directly: `UPDATE stores SET name = ... WHERE id = ...` (RLS restricts to owner/admin).

**Q: What happens if user is deleted from store_memberships?**  
A: They lose access immediately. RLS policies check `is_active = true`, so setting `is_active = false` revokes access.

**Q: Are there any triggers or side effects?**  
A: No automatic emails, webhooks, or external calls from these RPCs. Handle those in your application layer.

---

## Related Documentation

- [Supabase RPC Docs](https://supabase.com/docs/reference/javascript/rpc)
- [Refine Data Provider Supabase](https://refine.dev/docs/packages/documentation/data-providers/supabase/)
- [PostgreSQL User-Defined Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## Support

For issues or questions:

1. Check local Supabase logs: `supabase logs`
2. Verify RPC exists: `supabase db list functions`
3. Test with curl:
   ```bash
   curl -X POST http://localhost:54321/rest/v1/rpc/store_get_user_stores \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json"
   ```
