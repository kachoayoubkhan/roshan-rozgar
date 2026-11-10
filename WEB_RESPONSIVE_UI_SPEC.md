# Roshan Rozgar — Responsive Web UI Acceptance Specification

## Requirement from the competition (source of truth)
The problem statement requires **a web application running in a standard browser and usable on a phone-sized screen**. It excludes native mobile applications. It does **not** require a separate desktop-specific design; responsive desktop support is our engineering decision for good browser UX.

## Reference versus implementation
- `reference/Roshan-Rozgar-MVP-UI.png`: a two-lane montage of mobile UI mockups (worker/customer). It provides **style and flow reference**, not code, Figma frames, or production-ready text.
- Use its white/emerald palette, rounded cards, accessible controls, short Urdu/Roman Urdu labels, and clear booking states.
- Do **not** use the poster or phone frame graphics as the interface; create actual responsive semantic HTML/React screens.
- Remove iOS status bars, device bezels, poster headers, static arrows, and explanatory captions from the product UI.
- Content may improve the original mockup for accessibility and correct Urdu typesetting; do not copy malformed text or assume displayed seeded statistics are verified.

## Breakpoint behavior
- **360–430 px (phone):** single-column content, short headings, tap targets >=44px, full-width primary CTAs, compact bottom nav where appropriate, readable Urdu text and recording indicators. 390px is the visual baseline.
- **~768 px (tablet):** 2-column service and worker cards where readable; sensible margins and larger chat/history panel.
- **~1280 px (desktop):** full browser page, horizontal site header with role switch, centered `max-width: 1200px` content; two-column layout for customer request/search and results; worker profile/booking details may sit beside communication panel. Use responsive CSS, not distinct copied page implementations.
- At every size: no unintended horizontal scrolling or clipped dialogs, accessible tab/focus order, usable microphone permission states, functional navigation.

## Core routes and UI blocks
- `/`: responsive landing and role selection for Worker and Customer.
- `/worker/onboarding`: voice-first flow and confirmation, not a dense conventional form; later phases implement real AI.
- `/worker/home`: availability and incoming jobs.
- `/customer/home`: services and voice job request.
- `/customer/workers`: nearby available worker list with filters and trust cues.
- `/customer/bookings`: booking state/details; after implementation, customer can review completed booking.
- Other steps can be panels/dialogs on existing routes. Avoid routing proliferation.

## Minimal Phase 01 visual smoke tests
1. At 390x844 and 360x800, both role buttons are fully visible, clickable, and navigate to distinct working route shells.
2. At 768x1024, category cards adapt to available width and nothing clips.
3. At 1280x800, app occupies a real centered responsive web layout; the entire interface is **not** constrained to a phone-width container and does not display device bezels.
4. At all widths, controls and cards are real HTML components (not a giant screenshot), and keyboard focus is visible.
5. The official problem statement's five outcomes remain the phase roadmap; desktop visual polish must not delay working P0 features.

## Originality and disclosure
Fresh project-specific UI code must be written during the hackathon. Preexisting mockups can guide visual direction, but check organizer rules before submitting prior artifacts unchanged. Disclose seeded/mock data, API services and coding assistants in README.
