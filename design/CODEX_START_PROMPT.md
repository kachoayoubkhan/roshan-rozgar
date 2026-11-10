# Codex — Implement using the frozen web designs, do NOT redesign

We are implementing **Roshan Rozgar** for today's COMSATS AI Web Forge Hackathon. The official problem statement is mandatory. All five outcomes must work end-to-end: low-literacy worker onboarding, nearby+available discovery, communication and price agreement, consistent booking availability, and post-job trust.

The approved visual handoff is in `design/`:
- `design/CODEX_DESIGN_CONTRACT.md`: **binding visual, copy and responsive layout decisions**.
- `design/design-preview.html`: responsive HTML/CSS design reference; open it and inspect page states using URL hash (`#customer-home`, `#workers`, `#chat`, `#worker-onboard`, etc.).
- `design/assets/full-web-ui-board.png`: combined customer and worker desktop/mobile visual sheet.
- `design/assets/customer-flow-and-responsive.png`: seven-step customer flow + responsive behavior.
- `design/assets/customer-mobile-home.png`: mobile customer home reference.
- `design/assets/original-competition-mobile-flow.png`: initial hackathon flow inspiration.
- `design/PRD.md`: requirements and acceptance criteria.
- `design/assets/official-problem-statement.pdf`: the competition rules.

**IMPORTANT:** Treat the approved HTML, design tokens, page hierarchy and sample microcopy as the visual specification, not as generic inspiration. Translate it into responsive Next.js + TypeScript + Tailwind React components. The actual app must not display phone frames or pretend to be a native mobile app. Target 390px, 768px, and 1280px widths. Use Inter, white/emerald theme, large tap targets, readable Urdu/Roman Urdu, and the provided consistent Ali Raza / Ahmed Khan scenario.

Implement real operations using Supabase PostgreSQL, with atomic booking conflict protection. Runtime AI uses server-side OpenAI API for Urdu speech transcription + structured profile/request extraction and accessible voice/audio support. Do not confuse the HTML prototype's simulated interactions with working backend features. Never expose `OPENAI_API_KEY` or Supabase service-role keys to the browser.

**Phase 1 only**: Set up a clean app with routes, shared layout/design components, visual content and seeded demo data foundation. Run lint/typecheck/build. Do not add extra FYP modules (payments, CNIC, welfare, admin analytics, organizations). Stop and report changed files, validation evidence, blockers and exact instructions for running the project.

Competition originality rule: do not copy code from our preexisting FYP. All project-specific implementation must be written during the hackathon. Credit open source, declare all AI tools and seeded/mock data in README.
