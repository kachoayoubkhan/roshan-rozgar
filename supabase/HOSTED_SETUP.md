# Hosted Supabase setup

Run these only in the **Supabase SQL Editor** for project `xvfpjnztwcotvgcduvqm` (or your own project). Apply each migration once. Existing tables make schema.sql fail and roll back. Inspect a partially configured database before choosing which files to run.

## 1. Check current state (local)

```sh
node tests/check-hosted-schema.mjs
```

`MISSING` lines show which migration step to apply next.

## 2. Fresh project (empty `public` marketplace)

Run **one query at a time**, in order:

1. Paste and run the full contents of `supabase/schema.sql`.
2. Paste and run `supabase/phase_02.sql`.
3. *(Optional, for labeled demo workers and sample ratings)* Run `supabase/seed.sql`.
4. Paste and run `supabase/phase_03.sql`.
5. Paste and run `supabase/phase_04.sql`.

**Live booking demos** should use a real worker profile saved in onboarding (`onboarding_method` is not `seed`). Seeded workers appear in discovery but cannot receive requests.

## 3. Partially migrated project

| If check reports missing… | Run only |
| --- | --- |
| `schema (workers table)` | Full chain in section 2 |
| `phase_02` columns | `phase_02.sql`, then 3–5 if needed |
| `phase_03` view/RPCs | `phase_03.sql`, then `phase_04.sql` |
| `phase_04` only | `phase_04.sql` |

If `seed.sql` was never run and you want example listings, run it **before** `phase_03.sql` so booking backfill can set `selected_worker_id`.

## 4. After migrations

```sh
node tests/check-hosted-schema.mjs
```

All lines should show `OK`. Then verify the app at http://localhost:3000 with `.env.local` pointing at the same project.

## 5. Safety notes

- Migrations use `begin`/`commit` transactions.
- `seed.sql` uses `on conflict do nothing` and does not delete live rows.
- `phase_04.sql` replaces `marketplace_action` and `marketplace_job` with review support; it does not drop tables.
- RLS stays enabled; only `service_role` (server-side) may read or write application tables.
