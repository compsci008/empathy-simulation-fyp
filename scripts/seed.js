const fs = require("fs");
const path = require("path");
const db = require("../db");

const scenariosDirectory = path.join(
  __dirname,
  "..",
  "data",
  "scenarios"
);

function seedScenarios() {
  const files = fs
    .readdirSync(scenariosDirectory)
    .filter((file) => file.endsWith(".json"));

  let importedCount = 0;

  files.forEach((file) => {
    const filePath = path.join(
      scenariosDirectory,
      file
    );

    const rawData = fs.readFileSync(
      filePath,
      "utf8"
    );

    const scenario = JSON.parse(rawData);

    db.upsertScenario(scenario);

    console.log(
      `Imported scenario: ${scenario.id} (${file})`
    );

    importedCount += 1;
  });

  console.log(
    `Done. ${importedCount} scenario(s) imported.`
  );
}

try {
  seedScenarios();

  console.log(
    "Scenario database ready."
  );
} catch (error) {
  console.error(
    "Unable to seed database:",
    error
  );

  process.exit(1);
}