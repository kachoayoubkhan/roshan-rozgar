# Roshan Rozgar

A responsive marketplace for households and skilled tradespeople in Islamabad, built for the COMSATS University Islamabad AI Web Forge Hackathon.

## Run locally

Use Node.js 22 or newer. From the folder containing this README:

```sh
npm ci
npm run dev
```

For active editing, use `npm run dev`. For a production demo, stop the running server before `npm run build`, then start it again with `npm start`. Rebuilding while an older production process is still running can leave it serving references to missing JavaScript and CSS files. After a production update, refresh any already-open browser tabs. Run `npm run test:demo` to check real localhost asset loading and navigation.

Open http://localhost:3000. Role navigation and clearly labeled example discovery run without credentials. To enable persistent marketplace flows, copy `.env.example` to `.env.local` and configure:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-only key for speech transcription, structured extraction, and cloud Urdu playback. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. HTTPS is required except for loopback development. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for database reads and writes. |
| `DEMO_SESSION_SECRET` | Stable server-only cookie signing secret. Generate 32 random bytes with the command in `.env.example`. |

In a fresh Supabase project, apply `supabase/schema.sql`, `supabase/phase_02.sql`, optionally `supabase/seed.sql`, then `supabase/phase_03.sql` and `supabase/phase_04.sql`. See `supabase/HOSTED_SETUP.md` for hosted checks (`npm run check:hosted`) and safe ordering. Keep secrets in local or hosting environment configuration.

## Try the flows

- **Worker onboarding** at `/worker/onboarding`. Tap the microphone and say your name, trade, years of experience and neighbourhood. Visit charge and skills are optional. Listen to the read-back, answer any missing details or speak a correction, then say “Profile save karein” in the voice confirmation step or tap Save. Open the dashboard to see the confirmed profile. Reopen onboarding to edit it.
- **Customer intake** at `/customer/request`. Describe your problem, neighbourhood and urgency in Urdu, Roman Urdu or English. Add a preferred date, an exact time, or a budget if you have one. Review, edit and save the request. The link to discovery preselects its trade and neighbourhood. Open the latest saved request from the request page.
- **Microphone fallback.** Type a description for AI extraction, or use “Enter details manually” to review and save without calling AI. Microphone access requires HTTPS or localhost. Recordings are limited to 30 seconds and 3.5 MB.
- **Urdu read-back.** The app uses a device Urdu voice when available. “Listen” can generate Urdu audio on the server if a device voice is unavailable or fails. The cloud voice is AI-generated. Pronunciation varies, browsers can require an extra tap to play, and written prompts remain available if speech fails.

A signed, HttpOnly demo cookie scopes the confirmed profile and requests to this browser. It expires after 30 days. Clearing cookies, changing hostnames or rotating the signing secret can make prior records inaccessible from the browser. This is demo identity, with no account recovery or cross-device login. The service-role key stays on the server. API throttling is per process and is intended for a small demo.

## Data and scope

Live persistence uses the existing Supabase tables. The additive Phase 02 migration stores skills, optional visit charges, request budgets and date-only preferences. A profile version prevents stale edits from overwriting a confirmed profile. Requests are saved on explicit confirmation and can be reopened after refresh.

## Phase 03 walkthrough

1. Use two browser profiles or a normal and a private window. In the worker window, save a profile in onboarding, open the dashboard, and choose **Go online**.
2. In the customer window, save a request with the same trade and a nearby neighbourhood. Choose **Request this worker** on the live profile card.
3. Open the incoming job in the worker dashboard. Both participants can send messages, choose quick replies, or record an editable transcript before sending. Listen controls read the text aloud. The app stores text, sender and time, and never stores raw recordings.
4. The worker sends a PKR quote. The customer can request a revision or accept the displayed quote. Replacing a quote creates a new quote ID that needs separate acceptance.
5. The customer confirms a future date and time in Pakistan time. Both sides see the same reference, time, price and status. The worker starts the job and marks it complete. Customer booking history and the worker dashboard reopen the saved job.

Discovery uses database availability when configured. Example profiles are labeled and cannot receive requests. Phase 03 uses server-only PostgreSQL functions for ownership checks, conversation state, quotes and booking. The booking transaction locks the request and worker, checks the current accepted quote and online preference, then records the agreed amount and advances the request. The existing partial unique index also protects worker capacity. Completion releases engagement while respecting the worker's offline preference.

Request cancellation and worker decline are available before confirmation. A closed request remains in history. Start a new request to choose a different worker.

## Phase 04 — reviews

After a worker marks a booking **completed**, the customer can submit one **1–5 star** rating with optional written or voice-transcribed feedback on the job chat page. Reviews are stored in PostgreSQL with server-side guards: only the booking customer, only after completion, and only once. Worker discovery cards and the worker dashboard show average ratings and review counts from stored data. Seeded workers keep labeled demo reviews; live workers accumulate ratings from real completed bookings.

The app uses OpenAI `gpt-4o-mini-transcribe` for recorded speech, `gpt-4o-mini` for structured extraction and `gpt-4o-mini-tts` for cloud playback. OpenAI has announced that the requested transcription model is scheduled to shut down on February 26, 2027. See the [official transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text).

## Verify

```sh
npm run lint
npx tsc --noEmit
npm run build
npx playwright install chromium
npm run test:phase02
npm run test:phase03
npm run test:phase04
npm run check:hosted
```

The Phase 02 suite uses PGlite. Phase 03 starts an isolated native PostgreSQL cluster and verifies a real two-connection booking race. Both run the production app in Chromium with local HTTP stand-ins for the Supabase Data API and OpenAI. These suites verify application behavior and local PostgreSQL persistence. Live OpenAI and hosted Supabase require separate checks. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome. Phase 03/04 tests choose free local ports automatically. Override them with `PHASE03_TEST_PORT` and `PHASE03_PG_PORT` if needed.

## Credits

Next.js App Router, React, Tailwind CSS, shadcn/ui-style components, Lucide, Fontsource Inter, Zod, the Supabase JavaScript client, and the official OpenAI SDK. Codex and Cursor assisted with implementation and validation. No previous SkillConnect project-specific source was reused.


## Hosted demo verification

After the four migrations are applied, run `npm run check:hosted`, start the app with `npm start`, then run `npm run test:hosted`. This last command writes a clearly named demo worker, request, messages, booking and review to the configured hosted project. It verifies the rating after refresh and marks the demo worker offline afterward. It needs Chromium or `PLAYWRIGHT_CHANNEL=chrome`. The schema checker performs read-only checks; Phase 04 behavior is verified by the completed-job flow.


Hosted verification on 10 November 2026 passed after applying schema.sql, phase_02.sql, phase_03.sql and phase_04.sql without seed.sql. The browser smoke test completed a new worker/customer job through messaging, quote acceptance, booking, completion and review, and verified the 5-star rating after refresh. One labeled demo job remains stored, and its worker is offline.
