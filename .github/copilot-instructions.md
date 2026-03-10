# WinStore Admin Portal — SaaS OmniChannel Order Management

## Overview

Admin dashboard for WinStore, a SaaS omnichannel order management platform. Built on **Refine v5** with **MUI v7**, **React 19**, **Vite 7**, and **TypeScript 5**. Currently uses `@refinedev/simple-rest` data provider pointed at `https://api.finefoods.refine.dev` (demo). Being migrated to **Supabase** as the production backend.

## Build & Run

```bash
npm install          # install dependencies (Node >=20)
npm run dev          # start dev server (Vite + Refine CLI)
npm run build        # tsc && refine build (production)
```

Deployed to **Netlify** with SPA fallback (`netlify.toml`).

## Architecture

```
src/
├── App.tsx              # Refine providers, routing, resource definitions
├── authProvider.ts      # AuthProvider (migrating to Supabase Auth)
├── theme.ts             # MUI Light/Dark themes (RefineThemes.Orange base)
├── i18n.ts              # i18next with en/de, HTTP backend from /locales/
├── contexts/            # ColorModeContextProvider (light/dark toggle)
├── hooks/               # useAutoLoginForDemo, useOrderCustomKbarActions
├── interfaces/          # Shared TypeScript interfaces (IOrder, IProduct, etc.)
├── utils/               # geocoding, image-upload, unique-list-with-count
├── components/          # Reusable UI components (barrel-exported via index.ts)
│   ├── card/            # Generic card wrapper
│   ├── order/           # Order status, details, map, products, tableColumnProducts
│   ├── product/         # Product drawer-form, image-upload, list-card, list-table, status
│   ├── store/           # Store form, info-card, map, status, table, courier-table
│   ├── courier/         # Courier image-upload, rating, status, table-reviews
│   ├── customer/        # Customer status
│   ├── category/        # Category status
│   ├── dashboard/       # Chart widgets (dailyOrders, dailyRevenue, deliveryMap, etc.)
│   ├── drawer/          # Shared drawer + header
│   ├── header/          # App header with locale/theme toggles
│   ├── icons/           # Custom SVG icon components
│   ├── map/             # Google Maps (advanced-marker, marker, map wrapper)
│   └── title/           # App title/logo component
├── pages/               # Route-level page components
│   ├── auth/            # Login/Register/Forgot/Update password (AuthPage wrapper)
│   ├── dashboard/       # Dashboard with charts, stats, maps
│   ├── orders/          # Order list + show (read-only)
│   ├── customers/       # Customer list + show
│   ├── products/        # Product list + create + edit (drawer-based CRUD)
│   ├── stores/          # Store list + create + edit
│   ├── couriers/        # Courier list + create + edit
│   └── categories/      # Category list
```

## Refine.dev Conventions

- **Resources** are defined in `App.tsx` under `<Refine resources={[...]}>`. Each resource maps `name` → route paths (`list`, `show`, `create`, `edit`) and icons.
- **Data hooks**: Use `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`, `useCustom` from `@refinedev/core`. Never call APIs directly.
- **Auth hooks**: Use `useIsAuthenticated`, `useGetIdentity`, `useLogout` from `@refinedev/core`. Auth state is managed by `authProvider`.
- **Table**: Use `useDataGrid` from `@refinedev/mui` with MUI `<DataGrid>`, or `useTable` from `@refinedev/react-table` with `@tanstack/react-table`.
- **Forms**: Use `useForm` from `@refinedev/react-hook-form` wrapping `react-hook-form`. Register fields with `register()` or `Controller`.
- **Routing**: `react-router` v7 with `@refinedev/react-router`. Routes use `<Authenticated>` guard and `ThemedLayout`.
- **i18n**: Use `useTranslate` from `@refinedev/core` (wraps `i18next`). Translation keys in `/public/locales/{en,de}.json`.
- **Notifications**: `RefineSnackbarProvider` + `useNotificationProvider` from `@refinedev/mui`.
- **KBar**: Command palette via `@refinedev/kbar`. Custom actions in `useOrderCustomKbarActions`.

## MUI (Material UI) Conventions

- **MUI v7** with `@mui/material`, `@mui/icons-material`, `@mui/lab`, `@mui/x-data-grid`.
- Import components individually: `import Button from "@mui/material/Button"` (not `{ Button } from "@mui/material"`).
- **Theming**: Custom themes in `theme.ts` extending `RefineThemes.Orange` / `RefineThemes.OrangeDark`. Theme toggled via `ColorModeContext`.
- **Styling**: Use MUI `sx` prop for component-level styles. Use `styled()` or `GlobalStyles` for broader overrides. No separate CSS files.
- **Grid**: Uses `Grid` from `@mui/material/Grid` (v2-style). Note vite alias: `@mui/material/Grid2` → `@mui/material/Grid`.
- **DataGrid**: `@mui/x-data-grid` for all tabular data. Define columns with `GridColDef[]`.

## Tailwind CSS Integration (Planned)

When adding Tailwind CSS alongside MUI:

- Use Tailwind for layout utilities (`flex`, `grid`, `gap`, `p-*`, `m-*`) and spacing.
- Keep MUI components for interactive UI (buttons, dialogs, data grids, form controls).
- Avoid conflicting Tailwind resets with MUI — configure Tailwind's `preflight: false` or scope carefully.
- Prefer MUI `sx` prop for component-specific styles, Tailwind classes for page layout.

## Supabase Integration (Planned)

When integrating Supabase:

- Replace `@refinedev/simple-rest` with `@refinedev/supabase` data provider in `App.tsx`.
- Replace demo `authProvider` with Supabase Auth (`@refinedev/supabase` provides `authProvider`).
- Use Supabase client from a shared `src/supabaseClient.ts`:
  ```ts
  import { createClient } from "@supabase/supabase-js";
  export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  ```
- Database tables should mirror existing interfaces in `src/interfaces/index.d.ts`.
- Use Supabase Storage for image uploads (replace current mock/demo upload logic).
- Use Supabase Realtime for live order status updates where applicable.
- Row Level Security (RLS) policies must be configured on all tables.

## TypeScript & Code Style

- **Strict mode** enabled (`tsconfig.json`). No `any` types unless absolutely necessary.
- Interfaces live in `src/interfaces/index.d.ts`. Prefix with `I` (e.g., `IOrder`, `IProduct`).
- Components use `React.FC` with props typed inline or via interface.
- Barrel exports: Every component/page/hook folder has an `index.ts` re-exporting its public API.
- Named exports preferred (no default exports except `App.tsx` and `i18n.ts`).

## Key Patterns

- **Drawer-based CRUD**: Products and couriers use `<Drawer>` for create/edit instead of separate pages. The list page renders `<Outlet />` for nested drawer routes.
- **Status components**: Each entity (order, product, store, courier, customer, category) has a dedicated `status/` component rendering status chips with colors.
- **Dashboard**: Stat cards + charts (Recharts) + Google Maps delivery map + order timeline. Uses `useCustom` for aggregated API data.
- **Google Maps**: Custom `<Map>` wrapper with `@googlemaps/react-wrapper`. Advanced markers for stores/couriers.
- **Image upload**: Shared `useImageUpload` hook in `src/utils/use-image-upload/`.

## Conventions

- Place new pages in `src/pages/<resource>/` and register the resource in `App.tsx`.
- Place reusable components in `src/components/<domain>/` with barrel export.
- Add translation keys to both `en.json` and `de.json` when creating user-facing text.
- Use `dayjs` for date formatting (already a dependency).
- Use `lodash` utilities sparingly (already a dependency).
