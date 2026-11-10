# Roshan Rozgar — Frozen Web UI Design Contract (Hackathon)

**Official brief is the primary source of truth.** Build a **responsive browser-based full-stack web application**, not a Flutter/native app. The mobile mockups are design references, not literal phone frames in the website. All five official outcomes must work end to end.

## Handoff order of precedence
1. `assets/official-problem-statement.pdf`: mandatory outcomes, constraints and originality rules.
2. Product requirements (`PRD.md` if available in starter pack): behavior and scope.
3. This contract: **visual layout and design decisions; do not redesign.**
4. `design-preview.html`: inspect in a browser at `#customer-home`, `#workers`, `#worker-profile`, `#chat`, `#booking`, `#review`, `#worker-onboard`, `#worker-confirm`, `#worker-home`, `#worker-request`, `#worker-progress`.
5. `assets/full-web-ui-board.png`, `assets/customer-flow-and-responsive.png`, `assets/customer-mobile-home.png`, `assets/original-competition-mobile-flow.png`: static visual direction, not authoritative data or code.

## Exact UI tokens

```css
:root {
  --emerald: #087F4F;
  --deep-emerald: #075C3D;
  --mint: #EAF7EF;
  --white: #FFFFFF;
  --canvas: #F7F9F8;
  --ink: #172B24;
  --muted: #64746B;
  --border: #E2EAE5;
  --success: #23A65A;
  --warning: #E6A23C;
  --radius-card: 18px;
  --radius-button: 12px;
  --content-max: 1220px;
}
```

Use **Inter** (with `system-ui` fallback) for English/Roman Urdu. Use a suitable readable Urdu font and RTL direction on actual Urdu-script content. Spacing scale 4/8/12/16/24/32/48px. H1 desktop 40–52px; phone 28–34px. Body >= 15–16px. Buttons / tap targets >= 44px. Card elevation subtle (not glossy). Lucide icons with text. No phone bezels, iOS status bars, decorative poster headings or fake app store UI.

### Responsive rules
- `360–640px`: single-column layout, 2-column service tiles, full-width primary buttons, bottom navigation, stacked worker results, no horizontal scroll.
- `641–1023px`: 2-column service/category cards, split panels where comfortable, header nav can collapse.
- `>=1024px`: 1220px centered container; horizontal header; worker discovery left filter sidebar ~335px + results area; worker detail/contact 60/40 split; chat and booking 60/40 split; hero text and illustration side by side. Do not display a narrow phone-width web page on desktop.

## Frozen page inventory

| Route / panel | Purpose | Core UI |
|---|---|---|
| `/` | Role select | One Worker CTA + one Customer CTA |
| `/customer/home` | Discovery entry | Hero, voice CTA, 4 service tiles, nearby worker preview |
| `/customer/request` | Job description | Voice capture, confirm service, problem, location, time |
| `/customer/request/confirm` | AI confirmation | Extracted values + edit/re-record options |
| `/customer/workers` | Available discovery | Skill + distance + availability filtered cards; ratings |
| `/customer/workers/[id]` | Trust/profile | Self-reported experience, completed bookings, real reviews, indicative price |
| `/customer/jobs/[id]/chat` | Communication | Text/voice message, quote, accept price |
| `/customer/bookings/[id]` | Confirm booking | Identical worker/date/time/price shown to both parties; confirm |
| `/customer/bookings/[id]/review` | Post-job trust | 1–5 stars and optional comment; only after completion |
| `/worker/onboarding` | Worker voice onboarding | Large microphone, recording states, no conventional typed form |
| `/worker/onboarding/confirm` | Confirm extracted profile | Display structured fields, TTS readback, retry/correct by voice |
| `/worker/home` | Work dashboard | Available/busy toggle, pending request, current job, review summary |
| `/worker/jobs/[id]` | Quote / request response | Listen to request, accept/decline, submit quote |
| `/worker/bookings/[id]` | Job progress | Booking state timeline, mark completed |

**Do not** recreate 14 separate layouts from scratch: reuse header, bottom nav, content container, service cards, worker cards, badge, waveform, worker avatar, state timeline, quote card, message bubble, rating input, accessible recording control. Distinct screens/routes can use these reusable primitives.

## Seeded scenario: keep consistent across all pages
- Customer **Ahmed Khan**, G-11 Islamabad, leaking kitchen pipe, preferred **10 Nov 2026 at 4:00 PM**.
- Worker **Ali Raza**, **Plumber**, G-11 Islamabad, **5 years of experience (self-reported)**, 1.2km away, indicative Rs. 2,500, 48 completed jobs, rating 4.8 from 12 example reviews.
- Alternatives **Imran Khan** and **Waqas Ahmed** must also be *plumbers* for this particular search; do not list a mismatched electrician as a plumber search result.
- Proposed and agreed quote Rs. 2,500; same amount everywhere after acceptance.
- All demo records/reviews clearly disclosed as **seeded** in README; no unimplemented government ID/certificate verification badges.

## Functional states that MUST map to the UI
- Worker: draft profile → confirmed; manually offline/available; pending job → quoted → accepted → booked → working → completed.
- Customer: recorded/specified request → confirmed interpretation → ranked available workers → chat/quote → accepted price → confirmed booking → completed job → posted review.
- Availability is **server-computed**. Treat a confirmed booking as consuming capacity; use a DB transaction / constraint to reject competing bookings; don't let UI toggle override an active booking.
- Voice input must be genuine microphone recording + OpenAI transcription + structured extraction (not fake animated UI); use audio playback or text-to-speech for low-literacy accessibility, and provide explicit browser permission/error states.
- Don't fabricate AI extraction fields or ratings, don't silently confirm price, and don't allow reviews for incomplete jobs.
- No payment integration, wallets, organizations, admin dashboards, government verification, GPS tracking, or native application.

## Exact visual production priorities
1. Deliver mobile-first customer-home, request, discovery, chat/quote, booking, review.
2. Worker onboarding, confirmation, dashboard, request and progress.
3. Desktop responsive splits and loading/empty/error states.
4. Test end-to-end functioning and avoid visual polishing at the expense of submission.

## Handoff instructions to Codex
- Open `design-preview.html` in Chromium and inspect responsive views at widths **390, 768, 1280**. This is the exact visual reference rather than a generic inspiration image.
- Implement web pages in **Next.js + TypeScript + Tailwind** with reusable components. Preserve the defined page names, text hierarchy, colors, layouts, component roles and interaction states.
- Make necessary functional adaptations to the real database/API models, but **do not change design decisions without a material accessibility or technical reason**.
- The HTML is a **static UI preview only**. Buttons can change the displayed page/state but do **not** represent real speech recognition, AI, server bookings, or persisted reviews. Replace all mock functionality with actual implementations and disclose any remaining simulations.
- All project-specific code for competition submission must be created during the hackathon; don't copy old FYP implementation code.
