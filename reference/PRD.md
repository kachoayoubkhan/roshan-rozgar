# Roshan Rozgar — Hackathon MVP Product Requirements Document

**Version:** 1.0 (implementation baseline)  
**Date:** 10 November 2026  
**Competition:** COMSATS AI Web Forge Hackathon — Full-Stack Web Development & Applied AI  
**Submission gates:** Figma 12:00 PM · Code 3:00 PM · Evaluation 4:00 PM  
**Product lineage:** Domain understanding and visual direction informed by the SkillConnect FYP; this is a separately implemented, hackathon-scoped product.

## 1. Executive summary

Roshan Rozgar is a **mobile-first web marketplace** that helps Pakistani households find nearby, currently available skilled tradespeople and gives workers with limited literacy a practical way to join and manage jobs. The product's distinguishing feature is a **voice-first, Urdu/Roman Urdu-friendly workflow**: workers introduce themselves by speaking rather than filling conventional forms; customers can describe repairs aloud; the system turns speech into structured, editable-by-voice information.

The MVP supports a complete two-sided journey: **voice onboarding → service request → nearby available discovery → voice-friendly communication and price agreement → booking with consistent availability → job completion and review**. It is intentionally smaller than the SkillConnect FYP.

**Product thesis:** The platform succeeds if a low-literacy worker can participate without typing, and a customer can complete one reliable local booking end to end.

## 2. Source basis and boundary

### 2.1 Competition requirements (source-derived)

The Roshan Rozgar problem statement requires five connected outcomes: (O1) onboarding without conventional sign-up reading/typing, (O2) nearby and available discovery, (O3) accessible communication and price agreement, (O4) booking with consistent available/engaged state, and (O5) trust information after completion. It expects **meaningful AI**, encourages Urdu/Roman Urdu, allows seeded or simulated records if disclosed, and requires a mobile-usable **web application**, repository, README, and live demonstration.

### 2.2 SkillConnect FYP capabilities considered (source-derived)

SkillConnect's proposal supplies the relevant domain model: multi-role worker/customer profiles (Module 1), worker verification and reputation (Module 2), AI-assisted job posting and voice assistance (Module 4), skill/location/availability-based matching (Module 5), communication/bookings/ratings (Module 6), and broader organization, welfare, administration, and dispute modules (Modules 7–9). These guide product decisions; they are **not** an authorization to reuse prior code or pre-built project-specific design assets.

### 2.3 Explicit scope decision (design recommendation)

Implement **one browser-based MVP**, not Flutter/native mobile. Keep the updated SkillConnect-inspired **white + emerald** visual direction, but create competition-specific screens and code during the official hacking window. Avoid falsely presenting demo or simulated verification as real.

## 3. Goals, success criteria, and non-goals

### 3.1 P0 goals (must work during live demo)

1. A worker creates a useful profile through spoken answers and icon/audio guidance, **without completing a conventional typed sign-up form**.
2. A customer submits a service request, preferably by voice, and sees workers filtered by **matching skill, proximity, and server-computed availability**.
3. Customer and worker exchange at least one voice-friendly message, negotiate a quoted **PKR** amount, and explicitly agree to it.
4. Customer confirms the job; the selected worker becomes unavailable for conflicting bookings, with consistent state in both interfaces.
5. Worker marks the job complete; customer leaves a rating that appears in the worker's trust information.
6. All five outcomes are demonstrated with a connected dataset and no hidden resets.

### 3.2 Demo acceptance criteria

- A worker generated through voice onboarding can be retrieved from persisted records.
- An available worker appears in discovery; an engaged or manually offline worker does not appear as bookable.
- A second competing confirmation for the same engaged worker is rejected by the **server/database**, not just hidden in the UI.
- The agreed price shown to both parties and the booking summary is identical.
- A completed booking permits one review; the review is visible afterward.
- The AI component demonstrably converts free-form speech/text into structured profile or job fields; if it is unavailable, the app shows a clear retry or accessible non-AI alternative, and the limitation is disclosed.

### 3.3 Non-goals

No payments/wallets/commissions, government-database identity checks, facial recognition, certificates, live GPS tracking, AI skills exams, organization hiring, welfare/upskilling, dispute arbitration, advanced analytics, complex admin dashboard, native apps, full authentication/OTP, or production-scale multi-slot scheduling.

## 4. Target users and accessibility context

**Worker persona — Ali Raza, plumber, G-11 Islamabad.** Five years of informal work experience, speaks Urdu comfortably, uses a smartphone, and may not read forms or type lengthy responses. Needs voice onboarding, a simple available/busy control, spoken job details, an explicit quote, and a one-tap progress update.

**Customer persona — Ahmed Khan, G-11 Islamabad.** Has a leaking kitchen pipe and wants a plumber available today, with approximate location, reputation, clear quote, and confirmation. Needs low-friction discovery and reasonable trust signals.

**Accessibility principles:** Mobile-first; 44×44 px minimum tap targets; clear icon + label pairings; short Urdu/Roman Urdu; microphone interactions with obvious recording/stop/retry feedback; audio playback for important details; no color-only status indicators; readable contrast and font sizes. Browser permission denial and limited Urdu speech support must not dead-end the flow.

## 5. Product workflows

### 5.1 Worker journey (W)

**W1** Choose “Main Hunarmand Hoon” from role selection.  
**W2** Hear/see guided questions and record a voice introduction: name, trade, years of experience, service area, indicative visit charge.  
**W3** AI extracts structured fields, **reads the profile back aloud**, and the worker confirms or corrects by voice. Uncertain fields remain blank and are clarified, **never fabricated**.  
**W4** Profile is persisted; worker toggles “Dastiyab” on/off.  
**W5** Receive a customer request; listen to the problem; reply with a voice message or simple quick action and a PKR quote.  
**W6** Once a booking is confirmed, the worker is marked engaged, can start work, and can mark it completed.  
**W7** See new review and updated rating after completion.

### 5.2 Customer journey (C)

**C1** Choose “Mujhe Hunarmand Chahiye”; select category or describe the problem by voice.  
**C2** AI extracts service type, description, location, and urgency; customer confirms interpretation.  
**C3** View matching available workers ranked by service fit, distance, and reviews.  
**C4** Open worker profile; inspect ratings, completed-job count, experience **marked self-reported**, and indicative pricing.  
**C5** Send/play a voice message or choose a preset response; worker submits quote; customer accepts quote.  
**C6** Review booking details; confirm. Both parties see the same job ID, scheduled time, and agreed amount.  
**C7** After the worker marks completion, give a one-to-five-star rating and optional feedback.

### 5.3 Normal and error/alternative flows

- **Microphone permission denied / STT unsupported:** Display precise instruction, offer category icons, voice playback guidance, and optional speech recording/transcription API if configured. Do not claim speech-to-text works if unavailable.
- **AI extraction incomplete/uncertain:** Ask only for missing fields using a short guided question. Do not invent names, prices, or locations.
- **Location permission denied:** Select a neighborhood manually from short, icon-supported choices; do not block discovery.
- **No nearby match:** Expand radius (e.g., 3 km to 5 km), show explanatory message, allow another service area.
- **Worker rejects / goes offline:** Return to ranked alternatives, keep original request.
- **Price not agreed:** Booking cannot be confirmed.
- **Worker becomes busy before confirmation:** Reject confirmation transaction, notify customer, show next available workers.
- **Cancellation:** If offered in MVP, release active booking status transactionally; do not implement refund logic.
- **Job not completed:** Review button remains disabled.

## 6. Functional requirements with acceptance criteria

| ID | Priority | Requirement | Observable acceptance criterion |
|---|---|---|---|
| FR-01 | P0 | Role selection | Worker and customer launch their correct journeys; active demo identity is visible. |
| FR-02 | P0 | Voice-first worker onboarding | Worker can speak a self-introduction, **hear parsed fields read back aloud**, correct by voice, and persist profile without typing a conventional form. |
| FR-03 | P0 | Worker availability | Worker can set an online/offline preference; `bookable` is computed from preference **and active bookings** on the server. |
| FR-04 | P0 | Customer service request | AI converts spoken or transcribed problem into service category, description, location, urgency; user can confirm before posting. |
| FR-05 | P0 | Nearby worker discovery | Show only compatible, bookable workers with distances and ratings; results respond to availability changes. |
| FR-06 | P0 | Profile and trust preview | Display worker trade, distance, self-reported experience, completed-job count, reviews, and unverified/verified status without misleading badges. |
| FR-07 | P0 | Voice-friendly communication | Participants can send and play back a recorded voice note, or use a supported accessible quick-reply/voice-to-text interaction; record message ownership and timestamp. |
| FR-08 | P0 | Price negotiation | Worker proposes amount in PKR; customer explicitly accepts; quote and booking records keep exact amount. |
| FR-09 | P0 | Booking confirmation | Server atomically checks worker bookability and accepted quote; successful confirmation reserves worker; concurrent second confirmation fails. |
| FR-10 | P0 | Job lifecycle | Both roles display consistent `confirmed → in_progress → completed` transitions; worker can complete job, releasing engagement. |
| FR-11 | P0 | Post-job review | Customer may submit one 1–5 rating per completed booking, visible in worker trust summary. |
| FR-12 | P0 | AI disclosure/fallback | App handles AI/network failures without fabricated results and README identifies actual services used. |
| FR-13 | P1 | Manual area fallback | Customer can choose G-11/G-10/F-10 etc. if location permission denied. |
| FR-14 | P0 | Spoken confirmation/playback | The worker can hear profile fields and essential incoming job details read aloud via TTS or recorded audio without relying on text. |
| FR-15 | P1 | Polished transitions | Prototype-aligned loading, empty, success, and error states; responsive layout. |

**Implementation rule:** P0 is the ship gate. P1 items are implemented only after a fully tested end-to-end journey exists.

## 7. Availability, quotation, and booking business rules

**BR-01 — Source of truth.** Never trust the client-side `Available` toggle alone. Compute `bookable = worker.online_preference AND NOT EXISTS(active booking for worker)` on the server.

**BR-02 — Worker engagement.** For the event MVP, a worker can hold **at most one confirmed/in-progress booking at a time**, including future scheduled requests. Advanced non-overlapping calendar scheduling is explicitly out of scope.

**BR-03 — Atomic confirmation.** On confirm, execute a database transaction that checks accepted quotation, worker availability, and any active booking; reserve the worker and create the booking as **one indivisible operation**. Enforce uniqueness/locking in the database so simultaneous requests cannot both win.

**BR-04 — Quote immutability.** A booking cannot be confirmed without explicit acceptance of a worker quote. Once confirmed, the agreed price is saved to booking and cannot silently change.

**BR-05 — States.** Request: `open → quoted → price_agreed → booked` (or `declined/cancelled`); booking: `confirmed → in_progress → completed` (or `cancelled`). Only permitted transitions are exposed by the API. Enforce at most one active booking per worker with a transactional lock or database constraint (for example, a partial unique index on `worker_id` for active states).

**BR-06 — Completion and review.** Completion clears engagement (if online preference remains true, worker becomes bookable); only the booking customer can rate a completed booking, once.

**BR-07 — Truthful trust signals.** A rating is calculated from persisted reviews; seeded ratings or jobs must be labeled demo data in README. No badge may imply CNIC/government validation unless real verification occurs.

## 8. AI product requirements

### 8.1 AI-01: Voice-to-profile (primary differentiation)

**Input:** Audio in Urdu/Roman Urdu; transcript from speech recognition; permitted correction responses.  
**Processing:** Speech-to-text then LLM structured extraction. Output schema: `{name, trade, experience_years, service_area, visit_charge_pkr, confidence_or_missing_fields}`. Strictly validate trade enum, nonnegative years/charge, and supported location.  
**Output:** An **audibly read-back** and visibly displayed profile summary requiring worker confirmation before persistence.

**Why meaningful:** Without this component, the app cannot automatically turn a low-literacy worker's natural-language self-description into a complete structured profile; users must rely on a slower assisted/icon process.

### 8.2 AI-02: Spoken customer problem to job request

**Input:** Urdu/Roman Urdu voice transcript, e.g. “Kitchen ka pipe leak hai, G-11 mein aaj plumber chahiye.”  
**Processing:** Extract trade category, issue summary, location, urgency, preferred time when stated.  
**Output:** Confirmable service request; never infer unspoken pricing or claim a diagnosis from speech alone.

### 8.3 AI implementation guardrails

Use a real integrated STT service where available (or supported browser speech input with a documented compatibility limit) and one actual LLM extraction API; validate model JSON on the server. Keep credentials server-side, minimize stored audio, handle no speech/background noise/timeouts, and never portray hard-coded extraction as an AI call. If AI is mocked for the live demo, label it visibly and in README; this weakens innovation scoring, so functional integration is preferred. A browser-only speech feature does not replace truthful disclosure of which LLM/API was used.

## 9. Design specification / Figma traceability

**Design language:** Updated SkillConnect-inspired light UI, emerald `#087F4F`, dark green `#075C3D`, pale green `#EAF7EF`, white backgrounds, simple rounded cards, readable Urdu/Roman Urdu, friendly trade icons, and large microphone actions. Branding: **Roshan Rozgar** for this event.

| Figma frame | User / content | Primary requirements |
|---|---|---|
| S01 | Welcome + role selection | FR-01 |
| S02 | Worker voice onboarding | FR-02, FR-12 |
| S03 | Parsed worker profile confirmation | FR-02 |
| S04 | Worker home and online availability | FR-03 |
| S05 | Incoming job + voice reply + quote | FR-07, FR-08 |
| S06 | Worker booking timeline | FR-09, FR-10 |
| S07 | Customer home + voice request | FR-04 |
| S08 | Nearby available worker list | FR-05 |
| S09 | Worker profile + reviews | FR-06, FR-11 |
| S10 | Voice-friendly negotiation | FR-07, FR-08 |
| S11 | Booking summary + confirmation | FR-09 |
| S12 | Completion feedback + stars | FR-11 |

**Design delivery rule:** These are 12 design frames, not necessarily 12 unique engineering routes. Reuse components and stateful panels in code. Deliver editable Figma layers and clickable prototype connections; do not treat the earlier image mockup as an editable design file.

## 10. Proposed implementation architecture (recommendation)

For the short hacking window, choose a **single Next.js + TypeScript application** with Tailwind/shadcn-style components, server API routes, and **PostgreSQL (e.g., Supabase)**. Use Supabase Storage only if implementing real voice-note files. This is deliberately simpler than the SkillConnect FYP's Flutter + Express + multi-service architecture; it minimizes integration risk while meeting the web requirement.

**Layers**

- **Frontend:** Responsive React/Next.js, worker/customer routed journeys, browser geolocation, audio controls, Urdu/Roman Urdu labels.
- **Backend:** Next.js route handlers/server actions for AI extraction, matching, quote acceptance, booking transactions, and reviews.
- **Database:** PostgreSQL tables and constraints; server-side source of truth for availability.
- **AI:** STT capability + LLM schema extraction; graceful fallback and server-side validation.
- **Demo identity:** Seeded workers/customer identities selected from a role switcher; **not real authentication**. Use scoped demo session IDs; restrict public write operations where feasible and declare the limitation.

### 10.1 Minimal relational data model

| Entity | Core fields |
|---|---|
| `workers` | id, display_name, trade, experience_years, service_area, latitude, longitude, online_preference, visit_charge_pkr, onboarding_method |
| `customers` | id, display_name, service_area, latitude, longitude |
| `service_requests` | id, customer_id, trade, issue_description, location, urgency, preferred_time, status |
| `conversations` / `messages` | id, request_id, worker_id, sender_role/id, message_text OR audio_url, created_at |
| `quotes` | id, request_id, worker_id, amount_pkr, state (`proposed/accepted/rejected`), timestamps |
| `bookings` | id, request_id, worker_id, customer_id, accepted_quote_id, agreed_amount_pkr, scheduled_time, status, created_at |
| `reviews` | id, booking_id UNIQUE, worker_id, customer_id, rating_1_to_5, comment, created_at |

**Derived fields:** `bookable` and aggregate rating should be calculated from authoritative tables, not maintained as disconnected UI flags. Seeded workers need valid coordinates/areas for demonstrable distance calculations.

### 10.2 Backend contract (illustrative endpoints)

| Method / route | Function |
|---|---|
| `POST /api/ai/worker-profile` | Transcribe/extract structured worker data, report missing fields. |
| `POST /api/workers` | Persist confirmed worker profile. |
| `PATCH /api/workers/:id/availability` | Change online preference. |
| `POST /api/ai/service-request` | Extract structured trade/problem/location from speech or transcript. |
| `POST /api/service-requests` | Persist confirmed customer request. |
| `GET /api/workers?trade=&lat=&lng=&radiusKm=` | Return filtered, bookable, ranked workers. |
| `POST /api/messages` | Persist a voice-friendly message or text transcription. |
| `POST /api/quotes` / `POST /api/quotes/:id/accept` | Propose and accept a PKR quote. |
| `POST /api/bookings/confirm` | Atomic reservation; return conflict if already engaged. |
| `PATCH /api/bookings/:id/status` | Transition booking state. |
| `POST /api/reviews` | Validate and store one review after completion. |

A stored procedure or transactional backend command must perform booking confirmation, independent of UI/network races.

## 11. Non-functional requirements

- **NFR-01 Mobile usability:** Must work in a browser on approximately 360–430 px mobile widths; baseline target frame is 390×844 px.
- **NFR-02 Accessibility:** Major actions reachable with large tap targets, icon+text, audio alternatives, visible state changes, no required typing in worker onboarding.
- **NFR-03 Data integrity:** Concurrency-safe confirmation, consistent price, valid states, one review per completed booking.
- **NFR-04 Reliability:** Errors must be recoverable; no silent success on failed writes; loading and failure states for AI and networking.
- **NFR-05 Security:** Secrets server-side; input validation, bounded uploads, minimal PII, no unsupported “verified” claims; demo identities disclosed as insecure for production.
- **NFR-06 Responsiveness:** Aim for normal pages to load promptly on event Wi-Fi; prioritize predictable behavior and local demo fallback over optimistic performance claims.
- **NFR-07 Localization:** Clear Urdu/Roman Urdu prompts; correct Urdu script direction; PKR and Pakistan-focused area labels.
- **NFR-08 Observability:** Visible demo logs/status or server logs for critical booking and AI failures without exposing credentials.

## 12. Demo data, simulation, and disclosure

**Seed:** At least three plumbers in Islamabad with differing distances/ratings, at least one worker currently busy/offline, one sample customer, and one sample repair request. Example seeded profiles can include Ali Raza (G-11), Imran Khan, and Waqas Ahmed. Mark ratings, job counts, prices, and locations as illustrative demo data if not obtained from real transactions.

**Must be real in demo:** Profile creation/persistence, worker filtering using saved data, voice-friendly interaction path, quote acceptance, booking write and server-enforced availability, job completion, review write. **Permissible simulated elements:** Authentication, sample user identities, initial workers/jobs/reviews, static service areas, optional simulated arrival. Disclose each in README and verbally if relevant.

## 13. Test plan and acceptance scenarios

| Test | Steps | Expected result |
|---|---|---|
| T01 Voice onboarding | Speak worker details; confirm | New persisted worker has extracted name/trade/area. |
| T02 Missing field | Omit service area | App requests the missing field; does not invent it. |
| T03 Speech failure | Deny mic / STT unavailable | Accessible fallback and retry offered, no fake AI success. |
| T04 Matching | Request G-11 plumber | Only suitable, available plumbers rank by near distance/relevance. |
| T05 Offline worker | Toggle worker offline | Worker becomes unbookable in search. |
| T06 Messaging | Customer sends/play voice-friendly message | Worker can access and understand request. |
| T07 Price | Worker quotes 2500, customer accepts | Quote becomes accepted; booking summary says Rs. 2,500. |
| T08 Confirmation | Confirm booking | One booking stored; worker now engaged on both views. |
| T09 Race condition | Try second booking for engaged worker | Server rejects second confirmation, no double booking. |
| T10 Completion | Worker marks complete | Booking completed; engagement released. |
| T11 Review | Customer submits 5-star review | One stored rating; worker aggregate/trust display updates. |
| T12 Guard review | Review before completion or twice | Server rejects invalid or duplicate review. |
| T13 Mobile check | Use phone viewport | No clipped buttons, readable Urdu/Roman Urdu, usable navigation. |
| T14 End-to-end replay | Run full role-to-role demo | No manual DB edits or hidden state resets required. |

## 14. Delivery plan and scope control

**Gate A — Figma by 12:00 PM:** 12 linked mobile frames, clear components, both role journeys, key error/confirmation states. Minimum acceptable: all five outcomes visibly traceable in the clickable prototype.

**Gate B — Code by 3:00 PM:** A public repository with new project-specific commit history after official start; locally runnable or deployed web app; real P0 flow and tested database availability enforcement; README, seed script, actual AI/service disclosures. Submit a working smaller product rather than an unfinished larger one.

**Gate C — Evaluation by 4:00 PM:** Prepare a reliable 3–5 minute demonstration plus architecture and trade-off answers. Run on one seeded customer and new/seeded worker without restarting services mid-demo.

### Suggested build order (dependency-driven)

1. Project skeleton, visual tokens, database schema, seeded records.
2. Role switch + worker onboarding + AI parsing and persistence.
3. Customer request + discovery + availability computation.
4. Communication + quote proposal/acceptance.
5. Atomic booking + two-role status + completion.
6. Review write and updated trust display.
7. Mobile QA, exception paths, deployment/README, full rehearsal.

**Cut order if schedule slips:** Cut polish/animation → map → elaborate chat UI → advanced audio playback. **Do not cut:** worker onboarding, discovery, price agreement, booking integrity, review, and clear AI demonstration/disclosure. If full audio messaging is not available, use clearly accessible canned voice phrases and validated voice-to-text messages, disclosing the limitation.

## 15. Live evaluation script

**0:00–0:30 Problem:** Show that skilled workers struggle with digital forms and customers struggle to find trusted, available local help.  
**0:30–1:20 Worker onboarding:** Speak an introduction, show AI-parsed profile, confirm, turn availability on.  
**1:20–2:00 Customer discovery:** Speak a plumbing problem; confirm extracted request and show nearby available workers.  
**2:00–2:40 Negotiation + booking:** Play/send voice-friendly message, accept explicit quote, confirm job; show busy status.  
**2:40–3:20 Completion + trust:** Mark work complete; leave review; show rating update and restored availability.  
**3:20–4:00 Engineering explanation:** Explain speech→structured-data value, database transaction preventing double bookings, seeded elements, and trade-offs.

**Judging alignment:** Technical execution 30%; problem understanding 20%; innovation and AI 20%; usability/accessibility 15%; presentation 15%. Reliability is valued above feature count.

## 16. Risks and decisions

| Risk | Decision / mitigation |
|---|---|
| Urdu speech recognition fails on event browser | Test actual device early; support alternate STT API/recording route; display honest fallback. |
| AI model produces wrong fields | Strict schema validation, confidence/missing fields, human confirmation. |
| Booking conflicts | Atomic DB confirmation, guarded transitions, race-condition test. |
| Too many screens for deadline | Twelve Figma screens but consolidate code routes and reuse components. |
| Overbuilt FYP feature scope | Enforce P0 scope; payments, certificates, welfare, admin remain excluded. |
| Prior work originality conflict | Do not copy FYP code or submit prior project-specific designs as newly created; follow organizer clarification on visual references. |
| Demo data mistaken for real | Label seeded/mock data in README and avoid false verification badges. |
| Public write endpoints abused | Minimize data, use demo session scoping and input limits; disclose non-production auth. |

## 17. Definition of done

The MVP is **done** only if: all five mandatory outcomes work in a single connected demonstration; a worker profile and one booking can be completed without conventional form typing; quote and worker availability remain consistent across roles; a review appears after completion; the meaningful AI step is working or honestly disclosed; mobile screens are usable; the public repository, README, disclosures, seeded-data instructions, and demo runbook are ready; and all project-specific implementation work obeys the competition's hacking-window rules.

## 18. Open decisions fixed for hackathon execution

- **Brand for submission:** Roshan Rozgar; keep SkillConnect-inspired white/emerald look and accessible interaction principles.
- **Geography:** Islamabad / Rawalpindi pilot; seeded neighborhoods and optionally browser geolocation.
- **Trade categories:** Plumber, Electrician, AC Technician, Carpenter; add others only if time permits.
- **Scheduling:** One active booking per worker rather than production-grade calendars.
- **Payments:** No payment gateway, only PKR quote and agreement.
- **Trust:** Real reviews from demo flow plus clearly disclosed seeded ratings; no unimplemented identity badges.
- **Primary AI:** Spoken worker onboarding and spoken customer job-intake structured extraction.
- **Implementation style:** Single full-stack web app and transactional database; maintainable components and small API surface.

## 19. Reference documents

1. **Roshan_Rozgar_Problem_Statement.pdf**, pp. 1–3 — official mandatory outcomes, AI/technology conditions, evaluation weights, originality rules, and deliverables.
2. **SkillConnect.pdf**, pp. 3–9 — FYP problem framing, modules, original functional scope and architecture direction; pp. 16–20 include original (older) mockups.
3. **SkillConnect UI_UX Flow Showcase.png** — later updated SkillConnect visual direction; used as *inspiration*, not submitted as newly created editable event design.
4. **Competition-focused Figma prompt and discussion (10 Nov 2026)** — twelve-screen flow and design decisions aligned with the five official outcomes.

**Status:** This PRD is an actionable build baseline. The source-derived requirements are identified separately from recommended implementation choices. Further changes should be recorded as explicit scope decisions rather than silently added during development.
