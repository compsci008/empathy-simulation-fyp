// db.js
// SQLite data-access layer for the empathy simulation.
// Replaces the flat-file (fs.readFile/writeFile) storage in server.js with
// a single SQLite database file. The functions here return the same shapes
// server.js was already returning, so server.js only needs its data-access
// calls swapped, not its API contract with the frontend.

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
`);

// Mirrors the old readScenarioList(): summary info only, sorted by order.
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

// Mirrors the old readScenarioById(): full scenario object, including
// impacts, indicatorEffects, decisions, etc.
function getScenarioById(id) {
  const row = db.prepare("SELECT data FROM scenarios WHERE id = ?").get(id);
  if (!row) {
    const error = new Error(`Scenario not found: ${id}`);
    error.status = 404;
    throw error;
  }
  return JSON.parse(row.data);
}

// Used by the seed script (and optionally an admin/import route later) to
// insert or update a scenario record from a JSON object.
function upsertScenario(scenario) {
  db.prepare(
    `INSERT INTO scenarios (id, order_index, data)
     VALUES (@id, @order, @data)
     ON CONFLICT(id) DO UPDATE SET order_index = @order, data = @data`
  ).run({
    id: scenario.id,
    order: scenario.order || 999,
    data: JSON.stringify(scenario)
  });
}

// Mirrors the old readProgress().
function getProgress() {
  const rows = db.prepare("SELECT scenario_id, record FROM progress").all();
  const scenarios = {};
  rows.forEach((row) => {
    scenarios[row.scenario_id] = JSON.parse(row.record);
  });
  return { scenarios };
}

// Mirrors the old writeProgress(progress). Replaces the whole progress set
// in one transaction, same as the old writeProgress() overwriting the file.
function saveProgress(progress) {
  const safeProgress =
    progress && typeof progress === "object" ? progress : { scenarios: {} };

  const upsert = db.prepare(
    `INSERT INTO progress (scenario_id, record)
     VALUES (@id, @record)
     ON CONFLICT(scenario_id) DO UPDATE SET record = @record`
  );
  const clear = db.prepare("DELETE FROM progress");

  const transaction = db.transaction((data) => {
    clear.run();
    Object.entries(data.scenarios || {}).forEach(([id, record]) => {
      upsert.run({ id, record: JSON.stringify(record) });
    });
  });

  transaction(safeProgress);
  return safeProgress;
}

function clearProgress() {
  db.prepare("DELETE FROM progress").run();
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
