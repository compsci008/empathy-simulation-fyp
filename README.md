# Online Empathy Simulation for Caregivers

This final-project prototype is a web-based empathy simulation. It includes a frontend interaction flow and a lightweight backend/database component.

## Run the Full Version

Use the Node.js backend server:

```bash
node server.js
```

Then open:

```text
http://localhost:4173
```

## Technical Components

- `index.html`, `styles.css`, `script.js`: client-side simulation interface.
- `server.js`: backend HTTP server and API layer.
- `data/progress.json`: lightweight JSON database storing completed scenarios, scores, unsafe attempts, timestamps, and reflection responses.
- `data/scenarios/*.json`: scenario database files containing scenario text, choices, feedback, indicator effects, visual consequence effects, and summaries.

## Data-Driven Scenario System

Scenarios are no longer hardcoded in `script.js`. The backend reads JSON files from `data/scenarios/` and exposes them to the frontend.

To add a new scenario, create another JSON file in `data/scenarios/` using the same schema:

- title and description
- learning objective
- task sequence and choices
- correct and incorrect feedback
- condition indicator effects
- visual unsafe-action effects
- summary and caregiver insight

The frontend loads the scenario list dynamically and fetches the selected scenario only when the user chooses it.

## Simulation Complexity

The interaction is designed as more than a trivia-style question flow:

- Each scenario has a physical task sequence with safe and unsafe actions.
- Unsafe actions trigger visual risk feedback and reduce safety, confidence, independence, and empathy metrics.
- Safe actions still reduce energy, showing that safer movement can remain tiring for an elderly person.
- After completing the movement task, the learner chooses a caregiver response.
- The caregiver response affects empathy, independence, confidence, and safety scoring.
- Completed scenario data is stored through the backend API for progress tracking.

## Backend API

- `GET /api/scenarios`: loads the list of available scenario cards.
- `GET /api/scenarios/:id`: loads the selected scenario JSON file.
- `GET /api/progress`: loads saved progress.
- `POST /api/progress`: saves updated scenario scores and reflections.
- `DELETE /api/progress`: clears saved progress.

## Scoring Logic

Each scenario is scored out of 100:

- 3 safe actions are required.
- Safe completion provides the base score.
- Unsafe attempts reduce safety, confidence, independence, and empathy.
- Caregiver responses can improve or reduce empathy and independence.
- The final score combines safe movement, unsafe attempts, confidence, independence, and caregiver support quality.

The score is shown visually in the feedback screen and saved in the backend database.
