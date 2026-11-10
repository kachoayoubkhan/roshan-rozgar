# Paste this into Codex — Phase 01 only

You are the lead engineer for a fresh Roshan Rozgar hackathon MVP. Build **Phase 01: foundation, database design, and real responsive UI foundation**, then STOP and report. Follow the `AGENTS.md` in this folder.

Read `reference/PRD.md`, `reference/Competition-Problem-Statement.pdf`, and inspect `reference/Roshan-Rozgar-MVP-UI.png` first, and read `WEB_RESPONSIVE_UI_SPEC.md`. The PNG is our latest chosen visual direction. It is a mockup, not code or an editable Figma file.

**IMPORTANT scope:** Do not implement all application features yet. Today's P0 goal is a functioning vertical-slice MVP, with code submission by 3:00 PM Pakistan time. Prioritize a runnable, visually consistent base and database correctness, so later phases can be added safely. This is a **browser-based web product**; the phone-sized reference screens are not a requirement to render a mobile device frame on desktop.

## Phase 01 deliverables
1. Inspect existing directory. If empty, initialize a new Next.js App Router + TypeScript + Tailwind project in this repo. If already initialized, preserve working files. Use minimal dependencies and avoid heavy architecture.
2. Implement global design tokens from the mockup: emerald `#087F4F`, darker `#075C3D`, pale green `#EAF7EF`, white backgrounds, rounded cards/buttons, comfortable spacing, Lucide icons, responsive mobile layout. Prefer simple reusable components to ornate CSS.
3. Implement genuinely responsive web layouts, not fixed-width mobile mockups: use a conventional desktop header and max-width content container at wide widths; stack navigation/cards on phones. Do not use the screenshot as a UI background. Confirm no horizontal overflow at 360px, 390px, 768px and 1280px, and make sure keyboard navigation works. Build the same Worker and Customer flows across viewport sizes.
4. Create a clean welcome/role selection page at `/` with two actionable paths: **Worker / Main Hunarmand Hoon** and **Customer / Mujhe Hunarmand Chahiye**. Add initial WORKING mobile route shells `/worker/onboarding`, `/worker/home`, `/customer/home`, `/customer/workers`, and `/customer/bookings`. These pages should not pretend unfinished features work; use appropriate honest state/CTA and navigation.
5. Create `lib/types.ts` for shared domain types and `lib/schemas.ts` with Zod validation for worker profile, customer request, quote, booking, review, and AI-extracted fields. Prepare `lib/supabase/server.ts` that reads server-side env vars with sensible error reporting. Avoid exposing service role credentials on client.
6. Create `supabase/schema.sql` and `supabase/seed.sql` with minimal normalized tables: `workers`, `customers`, `service_requests`, `messages`, `quotes`, `bookings`, `reviews`. Include foreign keys, checks, appropriate status constraints, unique completed-job review, and a database-enforced **one active booking per worker** rule (e.g. partial unique index for `confirmed` / `in_progress`). Include an atomic SQL function for booking confirmation **only if it can be implemented and reasoned about correctly now**; otherwise document it explicitly as the first task in Phase 03, without unsafe fake booking endpoints.
7. Add `.env.example` with `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and required server-side Supabase keys (descriptive placeholders only). Ensure `.env.local` is ignored. Do NOT request or copy user secrets into code.
8. Create concise `README.md` with setup, DB migration steps, architecture summary, exact current feature state (working vs forthcoming), seeded/mocked disclosures, and competition/coding-assistant attribution.
9. If Supabase credentials are absent, **do not block**; scaffold SQL and use clearly marked demo fixtures in UI until database setup. Do not disguise fixture views as persisted data.
10. Run `npm install` as needed; then `npm run lint`, `npx tsc --noEmit`, and `npm run build` if available. Fix errors.

## Quality and constraints
- Fresh source code only; no copying earlier FYP source.
- No real OTP, payment gateway, CNIC OCR, maps SDK, native mobile, or irrelevant pages.
- All primary links navigate correctly. No nonfunctional CTA presented as live functionality.
- No secrets or unsafe API key exposure.
- Keep type safety and accessibility.

## Stop and report
After Phase 01, respond with:
- implemented routes and components,
- migration/seed SQL structure,
- checks run and results,
- current local run instructions,
- missing environment configuration,
- any blockers,
- suggested exact Phase 02 task.
**Do not move on to Phase 02 without the user's next instruction.**
