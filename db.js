// db.js
// SQLite data-access layer for the empathy simulation.

const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "data", "empathy.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    order_index INTEGER NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS progress (
    scenario_id TEXT PRIMARY KEY,
    record TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participant_progress (
    participant_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    record TEXT NOT NULL,
    PRIMARY KEY (participant_id, scenario_id)
  );
`);

function listScenarios() {
  const rows = db
    .prepare("SELECT data FROM scenarios ORDER BY order_index ASC")
    .all();

  return rows.map((row) => {
    const scenario = JSON.parse(row.data);

    return {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      status: scenario.status,
      available: scenario.available,
      learningObjective: scenario.learningObjective,
      order: scenario.order || 999
    };
  });
}

function getScenarioById(id) {
  const row = db
    .prepare("SELECT data FROM scenarios WHERE id = ?")
    .get(id);

  if (!row) {
    const error = new Error(`Scenario not found: ${id}`);
    error.status = 404;
    throw error;
  }

  return JSON.parse(row.data);
}

function upsertScenario(scenario) {
  db.prepare(
    `INSERT INTO scenarios (id, order_index, data)
     VALUES (@id, @order, @data)
     ON CONFLICT(id) DO UPDATE SET
       order_index = @order,
       data = @data`
  ).run({
    id: scenario.id,
    order: scenario.order || 999,
    data: JSON.stringify(scenario)
  });
}

// Get progress belonging only to one participant.
function getProgress(participantId) {
  const rows = db
    .prepare(
      `SELECT scenario_id, record
       FROM participant_progress
       WHERE participant_id = ?`
    )
    .all(participantId);

  const scenarios = {};

  rows.forEach((row) => {
    scenarios[row.scenario_id] = JSON.parse(row.record);
  });

  return { scenarios };
}

// Save progress belonging only to one participant.
function saveProgress(participantId, progress) {
  const safeProgress =
    progress && typeof progress === "object"
      ? progress
      : { scenarios: {} };

  const clear = db.prepare(
    `DELETE FROM participant_progress
     WHERE participant_id = ?`
  );

  const upsert = db.prepare(
    `INSERT INTO participant_progress (
       participant_id,
       scenario_id,
       record
     )
     VALUES (
       @participantId,
       @scenarioId,
       @record
     )
     ON CONFLICT(participant_id, scenario_id)
     DO UPDATE SET record = @record`
  );

  const transaction = db.transaction((data) => {
    clear.run(participantId);

    Object.entries(data.scenarios || {}).forEach(
      ([scenarioId, record]) => {
        upsert.run({
          participantId,
          scenarioId,
          record: JSON.stringify(record)
        });
      }
    );
  });

  transaction(safeProgress);

  return safeProgress;
}

// Clear progress belonging only to one participant.
function clearProgress(participantId) {
  db.prepare(
    `DELETE FROM participant_progress
     WHERE participant_id = ?`
  ).run(participantId);

  return { scenarios: {} };
}

module.exports = {
  listScenarios,
  getScenarioById,
  upsertScenario,
  getProgress,
  saveProgress,
  clearProgress
};