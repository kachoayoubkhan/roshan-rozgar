# Roshan Rozgar — Coding Agent Instructions

## Mission
Build a **fresh, independently implemented** hackathon web MVP satisfying the five outcomes in `reference/Competition-Problem-Statement.pdf`. `reference/PRD.md` defines the intended product. `reference/Roshan-Rozgar-MVP-UI.png` is the **primary visual reference**. Prior SkillConnect FYP materials inform the product domain, but project-specific existing code must not be reused.

## Hard deadlines (Pakistan Standard Time, 2026-11-10)
- Figma design submission 12:00 PM.
- Code submission 3:00 PM; complete working code, public repo, README, and demo.
- Evaluation 4:00 PM.

## Frozen stack
- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui-style components, Lucide icons.
- Supabase PostgreSQL for persistent data and atomic booking.
- OpenAI server-side APIs: `gpt-4o-mini-transcribe` for speech-to-text, `gpt-4o-mini` for structured extraction; Zod schema validation.
- Browser MediaRecorder for voice capture; browser SpeechSynthesis for audio read-back if reliable, with disclosed limitations/fallback.
- Nearby matching via seeded Islamabad coordinates and Haversine (no Maps API required).
- Vercel deployment target; local demo acceptable.
- No separate Express server, microservices, Flutter, payments, advanced identity verification, organization management, admin dashboards, or government services.

## Web platform clarification (mandatory)
- This submission is a **responsive web application**, NOT a native app, Flutter app, installable-only PWA, or a set of phone-shaped UI screenshots. The competition requires a normal-browser web application usable at phone size.
- The reference image contains **mobile mockups for visual guidance only**. Recreate those interactions as live semantic HTML/React components responsive to mobile, tablet, and desktop viewports; never render the original mockup image as the application UI.
- Read `WEB_RESPONSIVE_UI_SPEC.md` before building the UI.
- Browser functionality must not depend on a mobile-device emulator. Keyboard and desktop navigation must work.

## Design rules
- Follow `reference/Roshan-Rozgar-MVP-UI.png` visual language (white backgrounds, deep emerald green, pale green panels, rounded cards, large voice call-to-actions, clear headings, simple Urdu-friendly flows).
- Exact design reference must be inspected: do **not** use old dark SkillConnect screenshots.
- Mobile-first baseline 390px, with responsive layouts tested at 360px, 390px, 768px and 1280px; accessible tap targets >=44px, semantic controls, keyboard focus and readable contrast.
- Desktop layout uses the available browser width with a max-width content container; do not put the whole app inside a 390px device frame.
- Worker and customer flows are available from web navigation at all widths.
- Use natural Pakistani context: Islamabad/G-11, electricians, plumbers, AC technicians, carpenters, sample prices in PKR.
- Demo flows for worker and customer should connect to the **same persisted job and booking**. No disconnected fake counters.

## Product invariants
- P0 outcomes: voice-friendly onboarding, nearby/available discovery, voice-friendly communication+agreed quote, consistent booking+availability, review after completion.
- Worker bookable iff online_preference is true AND no active booking exists; enforce atomically in database, not only in UI.
- Booking amount must come from an explicitly accepted quote; no silent price changes.
- Only completed bookings may receive one review; ratings are derived from reviews.
- Seeded/mocked data must be disclosed; never pretend an API call occurred if it was mocked.
- OpenAI API key in `.env.local` **server-side only**, never exposed in browser or Git, and do not print secrets.
- Project-specific source must be written from scratch during the hacking window. Keep commit history after official start.
- Do not overengineer. Functional reliability > features.

## Agent working protocol
1. Inspect repository before changes; prefer small coherent phases, not a huge one-shot implementation.
2. After each phase run available checks: `npm run lint`, `npx tsc --noEmit`, `npm run build` and report exact results; do not claim a check passed unless executed.
3. Report files changed, features completed, outstanding blockers, and commands to run/test.
4. Do not delete user changes. Avoid unnecessary tools/dependencies. Stop when a phase's exit criteria are met.

## Frozen responsive web UI (new approved handoff)
Before UI work, read `design/CODEX_DESIGN_CONTRACT.md`, `design/CODEX_START_PROMPT.md`, and inspect `design/design-preview.html` and `design/assets/full-web-ui-board.png`. These supersede earlier screen-layout guidance when there is a visual conflict. Implement a genuine **responsive website** for 390/768/1280px, not phone-sized mockups inside a desktop page. The static HTML is a visual reference, not the backend implementation. Preserve exact colors, component hierarchy and microcopy where reasonable. Prioritize all five mandatory hackathon outcomes. Do not use any old SkillConnect project-specific source code.
