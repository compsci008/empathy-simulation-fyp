// scripts/seed.js
// One-time import: reads your existing data/scenarios/*.json files (and
// data/progress.json, if present) and loads them into the SQLite database.
// Run this once after setting up db.js: node scripts/seed.js
// Safe to re-run — it overwrites matching rows rather than duplicating them.

const fs = require("fs");
const path = require("path");
const { upsertScenario, saveProgress } = require("../db");

const scenariosDir = path.join(__dirname, "..", "data", "scenarios");
const progressFile = path.join(__dirname, "..", "data", "progress.json");

function seedScenarios() {
  const files = fs
    .readdirSync(scenariosDir)
    .filter((file) => file.endsWith(".json"));

  files.forEach((file) => {
    const raw = fs.readFileSync(path.join(scenariosDir, file), "utf8");
    const scenario = JSON.parse(raw);
    upsertScenario(scenario);
    console.log(`Imported scenario: ${scenario.id} (${file})`);
  });

  console.log(`Done. ${files.length} scenario(s) imported.`);
}

function seedProgress() {
  if (!fs.existsSync(progressFile)) {
    console.log("No existing progress.json found, skipping progress import.");
    return;
  }
  const raw = fs.readFileSync(progressFile, "utf8");
  const progress = JSON.parse(raw);
  saveProgress(progress);
  console.log("Imported existing progress.json into the database.");
}

seedScenarios();
seedProgress();
