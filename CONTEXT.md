# Project context

## What this project is
CM3070 Final Year Project for a BSc Computer Science (Honours) student at University
of London, titled "Designing an Online Empathy Simulation to Help Caregivers."
Supervisor: Yip See Wai. It's a web-based, browser-playable simulation ("Online
Empathy Simulation for Caregivers") that lets family caregivers experience daily
tasks from the perspective of an elderly person with mobility limitations
(the character is "Mr Lim"), then reflect on how to support him without taking
over his independence.

## Tech stack
- Backend: `server.js`, plain Node.js `http` module (no Express)
- Frontend: `script.js` (vanilla JS, single-page app with screen-state routing),
  `index.html`, `styles.css`
- Storage: **SQLite** via `better-sqlite3`, in `db.js`. Two tables:
  - `scenarios` (id, order_index, data — full scenario content as a JSON blob)
  - `progress` (scenario_id, record — completion data as a JSON blob)
- Scenario content is *authored* as JSON files in `data/scenarios/*.json`
  (`kettle.json`, `meal.json`, `bathroom.json`, `door.json`), then imported into
  SQLite via `scripts/seed.js`. **The database, not the JSON files, is the source
  of truth for the running app** — after editing any scenario JSON file, you must
  re-run `node scripts/seed.js` for the change to actually show up.
- The app was originally flat-file-only (reading JSON directly at runtime); it was
  migrated to SQLite recently, tested, and confirmed fully working end to end
  (verified by adding a throwaway 5th scenario via JSON + reseed, confirming it
  appeared in the UI with zero code changes, then removing it).

## App flow / screens
Home → Before (app intro + indicator glossary) → Choose (scenario selection) →
Learn (per-scenario read-up) → Task (interactive decision task) → Feedback →
Reflect → Summary. Nav bar shows all steps as clickable dots once passed.

## Core mechanic
Each scenario tracks 8 indicators: energy, balance, kneePain, confidence,
independence, safety, empathy, pressure. User actions during the Task screen
apply deltas to these (defined per-scenario in each JSON file's
`indicatorEffects.decisions.safe` / `.unsafe` / `.caregiver` objects). At the end,
`calculateEmpathySafetyScore()` in `script.js` computes a weighted score: Safety
30%, Empathy 25%, Independence 20%, Confidence 15%, Physical wellbeing
(energy+balance+inverted kneePain, averaged) 10%, minus 5 points per unsafe
attempt.

## Supervisor feedback driving current work (Mr Yip See Wai, verbatim notes)
Key points: how are scenarios/modules determined; change "project aim" wording to
"application objective/purpose"; "feedback for who?"; is the scoring hardcoded or
a real algorithm; what do the indicators mean and how are they measured; needs a
pre-exercise read-up (already exists — the "Before"/"Learn" screens); must explain
the flow and why it's ordered that way; **concern that the prototype plays like a
quiz — "will this make me more empathetic? No"**; state the prototype's scope
explicitly (it's 4 scenarios, not the whole intended system); should be
database-driven / read from data files rather than hardcoded, so scenarios can be
added by other people without touching code; explain the algorithm, not just the
UI; "protect yourself" by being upfront about scope so markers don't probe gaps.

## What's already been done (in the claude.ai session, verified working)
1. **SQLite migration** — done and tested (see above).
2. **Feedback screen reframing** (in `index.html` + `styles.css`), confirmed live:
   - Added a subtitle above the feedback text: "Here's what this caregiving
     decision meant for Mr Lim — not just whether you 'did well.'"
   - Added an italic line before the score panel: "The score below reflects Mr
     Lim's safety and wellbeing outcome. It's a summary, not the goal — the
     reflection that follows matters more."
   - Shrank and de-emphasized the score number visually (`.score-head strong`
     changed from large green bold to smaller, regular-weight, ink-colored text)
     so it doesn't visually dominate the screen — directly responding to the
     "feels like a quiz" feedback.

## What's next — building real empathy, not just a scored quiz
Agreed plan, in order, addressing "will this make me more empathetic? No":

1. **Rewrite `taskDescription` in all 4 scenario JSON files to first-person,
   embodied language** (currently third-person / instructional, e.g. "Click the
   items in the order Mr Lim should handle them"). Draft replacement text was
   already written for all 4 scenarios in the claude.ai session — e.g. for
   kettle.json: "Your knee aches and your balance isn't quite steady today. The
   path ahead is narrow, and reaching straight for the kettle could mean a fall.
   Choose carefully — this is your body, your risk." **This edit had NOT yet
   been applied to the actual files when the session ended** — this is the
   immediate next task. Remember: after editing, re-run `node scripts/seed.js`.
2. Add a short "how did that feel" affective check-in on the Task or Feedback
   screen, before the score is revealed, so the user has to articulate their own
   emotional response rather than jumping straight to a number.
3. Add an emotional-consequence sentence to each scenario's feedback text (the
   `feedback` field in the JSON), not just physical/safety outcome — e.g. how the
   choice affected Mr Lim's dignity, anxiety, or trust, not only his fall risk.
4. Consider further de-emphasizing or renaming the "empathy-safety score" label
   itself, since labeling a number "empathy" arguably undercuts the point.
5. **Biggest/last item**: a "felt friction" mechanic — right now the user just
   watches indicator bars change; consider making the Task screen interaction
   itself harder (e.g. delayed or less precise clicks) when kneePain/balance are
   poor, so difficulty is *experienced*, not just displayed as a stat.

## Report status (paused — prototype work takes priority right now)
Final report has 6 graded chapters with strict word caps (Intro 1000, Lit review
2500, Design 2000, Implementation 2500, Evaluation 2500, Conclusion 1000; total
cap 10,500 words, strictly enforced). Chapters 1–3 are complete in
`Final_Project_Report.docx` (Chapter 3 is at 1951/2000 words, near its cap).
Chapter 4 (Implementation) was drafted in the claude.ai session — 4.1 Prototype
Overview and 4.2 System Implementation (5 subsections: data architecture, content
pipeline, backend API, frontend state, scoring algorithm) — **but this draft is
based on the prototype BEFORE the empathy-focused UI changes above, so it will
need revision once those are done.** 4.3 (Prototype Demonstration) and 4.4
(Implementation Progress / Remaining Work) haven't been drafted yet. Do not start
writing report content unless explicitly asked — the student wants the prototype
finished first.

## Working style / preferences
- Informal, direct communication. No em dashes in written prose.
- Wants concrete, copy-paste-ready output, not vague direction.
- Corrects mistakes directly and expects them fixed without excessive apology.
- Prefers working through changes one at a time rather than big-bang rewrites.
- Sans-serif fonts (Helvetica) preferred for any formatted documents.
