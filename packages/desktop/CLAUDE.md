# @scemas/desktop

vite + react SPA for the tauri desktop app. replaces the next.js dashboard's tRPC layer with tauri IPC calls backed by TanStack Query.

## structure

- `src/main.tsx` — vite entry
- `src/app.tsx` — QueryClientProvider + TanStack RouterProvider
- `src/router.tsx` — route tree with role-based beforeLoad guards
- `src/layouts/console-layout.tsx` — sidebar + header shell (admin + operator)
- `src/pages/` — 13 page components matching web dashboard routes
- `src/lib/tauri.ts` — typed hooks wrapping `@tauri-apps/api/core` invoke + react-query
- `src/store/auth.ts` — zustand auth state (token + user)
- `src/app.css` — imports `@scemas/ui/theme.css` + tailwind

## routes

operator: /dashboard, /alerts, /alerts/:alertId, /metrics, /metrics/:zone
admin: /rules, /users, /devices, /health, /audit
public: /display
auth: /sign-in, /sign-up

## data layer

```ts
useTauriQuery<T>(commandName, args, options) // reads
useTauriMutation<TArgs>(commandName, invalidateKeys) // writes
```

## dev

```sh
scemas dev desktop                    # all-in-one
bun --filter @scemas/desktop dev      # vite only (:5173)
```
