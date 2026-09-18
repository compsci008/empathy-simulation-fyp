const screens = Array.from(document.querySelectorAll("[data-screen]"));
const stepDots = Array.from(document.querySelectorAll("[data-step-dot]"));
const scenarioGrid = document.querySelector("#scenarioGrid");
const reflectionForm = document.querySelector("#reflectionForm");
const reflectionOutput = document.querySelector("#reflectionOutput");
const caregiverInsightOutput = document.querySelector("#caregiverInsightOutput");
const progressOutput = document.querySelector("#progressOutput");
const progressPanel = document.querySelector("#progressPanel");
const scorePanel = document.querySelector("#scorePanel");
const aboutModal = document.querySelector("#aboutModal");
const simStatus = document.querySelector("#simStatus");
const resetTaskButton = document.querySelector("#resetTask");
const continueDecisionButton = document.querySelector("#continueDecision");
const resetProgressButton = document.querySelector("#resetProgress");
const simObjects = Array.from(document.querySelectorAll("[data-sim-action]"));
const kitchenSim = document.querySelector("#kitchenSim");
const taskEnergy = document.querySelector("#taskEnergy");
const taskEnergyBar = document.querySelector("#taskEnergyBar");
const taskBalance = document.querySelector("#taskBalance");
const taskPain = document.querySelector("#taskPain");
const taskConfidence = document.querySelector("#taskConfidence");
const taskConfidenceBar = document.querySelector("#taskConfidenceBar");
const taskIndependence = document.querySelector("#taskIndependence");
const taskIndependenceBar = document.querySelector("#taskIndependenceBar");
const metricSafety = document.querySelector("#metricSafety");
const metricPressure = document.querySelector("#metricPressure");
const caregiverChoicePanel = document.querySelector("#caregiverChoicePanel");
const caregiverOptions = document.querySelector("#caregiverOptions");
const caregiverResult = document.querySelector("#caregiverResult");
const simEffect = document.querySelector("#simEffect");
const taskEyebrow = document.querySelector("#taskEyebrow");
const taskTitle = document.querySelector("#taskTitle");
const taskDescription = document.querySelector("#taskDescription");
const readupTitle = document.querySelector("#readupTitle");
const readupContext = document.querySelector("#readupContext");
const readupChallengeTags = document.querySelector("#readupChallengeTags");
const readupPoints = document.querySelector("#readupPoints");
const readupObjective = document.querySelector("#readupObjective");
const startScenarioButton = document.querySelector("#startScenario");
const movementProgress = document.querySelector("#movementProgress");
const movementProgressBar = document.querySelector("#movementProgressBar");
const feelingOptions = document.querySelector("#feelingOptions");
const feedbackReveal = document.querySelector("#feedbackReveal");

const feelingLabels = {
  calm: "Calm and steady",
  anxious: "Anxious, on edge",
  guilty: "Guilty for slowing him down",
  frustrated: "Frustrated or impatient",
  uncertain: "Unsure I was doing the right thing"
};

const actionLabels = {
  stool: document.querySelector("#actionLabelStool"),
  walker: document.querySelector("#actionLabelWalker"),
  kettle: document.querySelector("#actionLabelKettle")
};

let scenarios = [];
let selectedScenario = null;

const scenarioCache = new Map();

const fallbackScenarioFiles = [
  "data/scenarios/kettle.json",
  "data/scenarios/meal.json",
  "data/scenarios/bathroom.json",
  "data/scenarios/door.json"
];

let taskStep = 0;
let currentScreen = "home";
let unsafeAttempts = 0;
let currentScenarioScore = 0;
let taskMetrics = {};
let selectedCaregiverChoice = null;
let selectedFeeling = null;
let taskRunToken = 0;

const taskSequence = ["stool", "walker", "kettle"];

const screenOrder = [
  "home",
  "intro",
  "decision",
  "readup",
  "task",
  "feedback",
  "reflection",
  "summary"
];

// ---------------------------------------------------------
// PARTICIPANT-SPECIFIC PROGRESS
// ---------------------------------------------------------

const progressStorageKey = "empathySimulationProgress";
const participantStorageKey = "empathySimulationParticipantId";

const participantId = getOrCreateParticipantId();

let backendAvailable = false;

const unsafeAttemptPenalty = 5;

const unsafeSceneEffects = {
  kettle: {
    stool: { className: "unsafe-bump", label: "Blocked path" },
    walker: { className: "unsafe-bump", label: "Stool still blocking" },
    kettle: { className: "unsafe-fall", label: "Trip risk" }
  },

  meal: {
    stool: { className: "unsafe-spill", label: "Cluttered counter" },
    walker: { className: "unsafe-fatigue", label: "Fatigue building" },
    kettle: { className: "unsafe-spill", label: "Spill risk" }
  },

  bathroom: {
    stool: { className: "unsafe-dark", label: "Dim light" },
    walker: { className: "unsafe-dark", label: "Poor visibility" },
    kettle: { className: "unsafe-rush", label: "Rushed step" }
  },

  door: {
    stool: { className: "unsafe-rush", label: "Moved too fast" },
    walker: { className: "unsafe-rush", label: "No pause" },
    kettle: { className: "unsafe-fall", label: "Stumble risk" }
  }
};

const caregiverResponses = [
  {
    id: "guided-support",
    icon: "A",
    label: "Support nearby",
    description: "Safer path, Mr Lim stays in control.",
    result: "Best choice. Safer and still independent.",
    impact: ["Safety up", "Dignity up"]
  },

  {
    id: "take-over",
    icon: "B",
    label: "Take over",
    description: "Quick help, but less independence.",
    result: "Mixed choice. Safe, but confidence drops.",
    impact: ["Effort down", "Control down"]
  },

  {
    id: "rush",
    icon: "C",
    label: "Rush him",
    description: "Fast response, higher fall risk.",
    result: "Risky choice. Pressure increases.",
    impact: ["Pressure up", "Safety down"]
  }
];

// ---------------------------------------------------------
// PARTICIPANT ID
// ---------------------------------------------------------

function getOrCreateParticipantId() {
  let id = localStorage.getItem(participantStorageKey);

  if (!id) {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      id = window.crypto.randomUUID();
    } else {
      id =
        "participant-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substring(2);
    }

    localStorage.setItem(participantStorageKey, id);
  }

  return id;
}

// ---------------------------------------------------------
// LOCAL PROGRESS
// ---------------------------------------------------------

function loadProgress() {
  try {
    const saved = localStorage.getItem(progressStorageKey);

    return saved
      ? JSON.parse(saved)
      : { scenarios: {} };
  } catch {
    return { scenarios: {} };
  }
}

let progress = loadProgress();

function saveProgress() {
  localStorage.setItem(
    progressStorageKey,
    JSON.stringify(progress)
  );

  saveProgressToBackend();
}

// ---------------------------------------------------------
// SCENARIOS
// ---------------------------------------------------------

async function loadScenarioList() {
  scenarioGrid.innerHTML =
    `<div class="impact-item">Loading scenarios...</div>`;

  try {
    const response = await fetch("/api/scenarios");

    if (!response.ok) {
      throw new Error("Unable to load scenarios");
    }

    const payload = await response.json();
    scenarios = payload.scenarios || [];
  } catch {
    scenarios = await loadScenarioListFromFiles();
  }

  renderScenarios();
  renderProgressPanel();
}

async function loadScenarioById(id) {
  if (scenarioCache.has(id)) {
    return scenarioCache.get(id);
  }

  try {
    const response = await fetch(
      `/api/scenarios/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error(`Unable to load scenario: ${id}`);
    }

    const scenario = normalizeScenario(
      await response.json()
    );

    scenarioCache.set(id, scenario);

    return scenario;
  } catch (error) {
    const summary = scenarios.find(
      (scenario) => scenario.id === id
    );

    if (!summary?.file) {
      throw error;
    }

    const response = await fetch(summary.file);

    if (!response.ok) {
      throw error;
    }

    const scenario = normalizeScenario(
      await response.json()
    );

    scenarioCache.set(id, scenario);

    return scenario;
  }
}

async function loadScenarioListFromFiles() {
  const loadedScenarios = await Promise.all(
    fallbackScenarioFiles.map(async (file) => {
      const response = await fetch(file);

      if (!response.ok) {
        throw new Error(`Unable to load ${file}`);
      }

      const scenario = normalizeScenario(
        await response.json()
      );

      scenarioCache.set(scenario.id, scenario);

      return {
        id: scenario.id,
        order: scenario.order || 999,
        title: scenario.title,
        description: scenario.description,
        status: scenario.status,
        available: scenario.available,
        learningObjective: scenario.learningObjective,
        file
      };
    })
  );

  return loadedScenarios.sort(
    (first, second) => first.order - second.order
  );
}

function normalizeScenario(scenario) {
  const actions = scenario.actions || {};
  const warnings = scenario.warnings || {};
  const correctReasons = scenario.correctReasons || {};

  (scenario.tasks || []).forEach((task) => {
    actions[task.id] = task.label;
    warnings[task.id] = task.warning;
    correctReasons[task.id] = task.correctReason;
  });

  return {
    ...scenario,

    actions,
    warnings,
    correctReasons,

    impacts: scenario.impacts || [],

    indicatorEffects: {
      initialState: {},
      decisions: {
        safe: {},
        unsafe: {}
      },
      caregiver: {},
      ...(scenario.indicatorEffects || {})
    }
  };
}

// ---------------------------------------------------------
// SCREEN NAVIGATION
// ---------------------------------------------------------

function showScreen(name) {
  currentScreen = name;

  screens.forEach((screen) => {
    screen.classList.toggle(
      "is-active",
      screen.dataset.screen === name
    );
  });

  const activeStep = name;
  const activeIndex = screenOrder.indexOf(activeStep);

  stepDots.forEach((dot) => {
    const dotIndex = screenOrder.indexOf(
      dot.dataset.stepDot
    );

    const isActive =
      dot.dataset.stepDot === activeStep;

    const isPast =
      dotIndex < activeIndex;

    dot.classList.toggle(
      "is-active",
      isActive
    );

    dot.classList.toggle(
      "is-clickable",
      isPast
    );

    dot.disabled = !isPast;

    dot.setAttribute(
      "aria-current",
      isActive ? "step" : "false"
    );
  });

  if (name === "decision") {
    renderProgressPanel();
    renderScenarios();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function goToPreviousStep(name) {
  const targetIndex =
    screenOrder.indexOf(name);

  const currentIndex =
    screenOrder.indexOf(currentScreen);

  if (
    targetIndex < 0 ||
    targetIndex >= currentIndex
  ) {
    return;
  }

  if (name === "decision") {
    resetTask();
  }

  showScreen(name);
}

// ---------------------------------------------------------
// BACKEND PARTICIPANT PROGRESS
// ---------------------------------------------------------

async function loadProgressFromBackend() {
  try {
    const response = await fetch(
      "/api/progress",
      {
        headers: {
          "X-Participant-ID": participantId
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        "Progress API unavailable"
      );
    }

    const backendProgress =
      await response.json();

    backendAvailable = true;

    const localProgress = loadProgress();

    const backendScenarios =
      backendProgress.scenarios || {};

    const localScenarios =
      localProgress.scenarios || {};

    /*
      Merge this participant's local browser
      progress with this participant's backend
      progress.

      Local progress takes priority if both
      contain the same scenario.
    */
    progress = {
      scenarios: {
        ...backendScenarios,
        ...localScenarios
      }
    };

    localStorage.setItem(
      progressStorageKey,
      JSON.stringify(progress)
    );

    // Keep this participant's backend copy synced.
    await saveProgressToBackend();

    renderScenarios();
    renderProgressPanel();
  } catch (error) {
    console.warn(
      "Backend progress unavailable:",
      error
    );

    backendAvailable = false;

    // Local progress still works.
    progress = loadProgress();

    renderScenarios();
    renderProgressPanel();
  }
}

async function saveProgressToBackend() {
  if (!backendAvailable) {
    return;
  }

  try {
    const response = await fetch(
      "/api/progress",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Participant-ID":
            participantId
        },

        body: JSON.stringify(progress)
      }
    );

    if (!response.ok) {
      throw new Error(
        "Progress API save failed"
      );
    }
  } catch (error) {
    console.warn(
      "Unable to save backend progress:",
      error
    );

    backendAvailable = false;
  }
}

async function clearProgressFromBackend() {
  try {
    const response = await fetch(
      "/api/progress",
      {
        method: "DELETE",

        headers: {
          "X-Participant-ID":
            participantId
        }
      }
    );

    backendAvailable = response.ok;

    return response.ok;
  } catch (error) {
    console.warn(
      "Unable to clear backend progress:",
      error
    );

    backendAvailable = false;

    return false;
  }
}

// ---------------------------------------------------------
// SCORE CALCULATIONS
// ---------------------------------------------------------

function calculatePhysicalWellbeing() {
  const energy =
    taskMetrics.energy || 0;

  const balance =
    taskMetrics.balance || 0;

  const painComfort =
    100 - (taskMetrics.kneePain || 0);

  return clampMetric(
    Math.round(
      (
        energy +
        balance +
        painComfort
      ) / 3
    )
  );
}

function calculateEmpathySafetyScore() {
  const physicalWellbeing =
    calculatePhysicalWellbeing();

  const weightedScore =
    (taskMetrics.safety || 0) * 0.3 +
    (taskMetrics.empathy || 0) * 0.25 +
    (taskMetrics.independence || 0) * 0.2 +
    (taskMetrics.confidence || 0) * 0.15 +
    physicalWellbeing * 0.1;

  return clampMetric(
    Math.round(
      weightedScore -
      unsafeAttempts *
        unsafeAttemptPenalty
    )
  );
}

// ---------------------------------------------------------
// PROGRESS DISPLAY
// ---------------------------------------------------------

function getProgressStats() {
  const records =
    Object.values(progress.scenarios);

  const completed =
    records.length;

  const totalScore =
    records.reduce(
      (sum, record) =>
        sum + record.score,
      0
    );

  const average =
    completed
      ? Math.round(
          totalScore / completed
        )
      : 0;

  const total =
    scenarios.length ||
    Math.max(
      completed,
      fallbackScenarioFiles.length
    );

  return {
    completed,
    total,
    average
  };
}

function renderProgressPanel() {
  const hasScenarioData =
    scenarios.length > 0;

  progressPanel.hidden =
    !hasScenarioData;

  resetProgressButton.hidden =
    !hasScenarioData;

  if (!hasScenarioData) {
    progressPanel.innerHTML = "";
    return;
  }

  const stats =
    getProgressStats();

  progressPanel.innerHTML = `
    <h3>Saved progress</h3>

    <p>
      <strong>
        ${stats.completed}/${stats.total}
      </strong>
      scenarios completed
    </p>

    <p>
      <strong>
        ${stats.average}%
      </strong>
      average outcome score
    </p>
  `;
}

// ---------------------------------------------------------
// SCORE PANEL
// ---------------------------------------------------------

function renderScorePanel() {
  currentScenarioScore =
    calculateEmpathySafetyScore();

  scorePanel.innerHTML = `
    <div class="score-head">
      <span>Outcome score</span>
      <strong>${currentScenarioScore}%</strong>
    </div>

    <div
      class="score-bar"
      aria-hidden="true"
    >
      <span
        style="width: ${currentScenarioScore}%"
      ></span>
    </div>

    <div class="score-breakdown">

      <div>
        <span>Safe actions</span>
        <strong>
          ${taskSequence.length}/${taskSequence.length}
        </strong>
      </div>

      <div>
        <span>Unsafe attempts</span>
        <strong>
          ${unsafeAttempts}
        </strong>
      </div>

      <div>
        <span>Safety</span>
        <strong>
          ${taskMetrics.safety}%
        </strong>
      </div>

      <div>
        <span>Independence</span>
        <strong>
          ${taskMetrics.independence}%
        </strong>
      </div>

      <div>
        <span>Felt supported</span>
        <strong>
          ${taskMetrics.empathy}%
        </strong>
      </div>

      <div>
        <span>Confidence</span>
        <strong>
          ${taskMetrics.confidence}%
        </strong>
      </div>

    </div>

    <details class="score-note">
      <summary>
        How is this calculated?
      </summary>

      <p>
        Safety 30%, empathy 25%,
        independence 20%, confidence 15%,
        physical wellbeing 10% —
        minus 5 points per unsafe attempt.
      </p>

      <p>
        Even the safest choices can't fully
        undo physical strain, which is why
        a perfect 100% isn't possible.
      </p>
    </details>
  `;
}

// ---------------------------------------------------------
// SAVE SCENARIO COMPLETION
// ---------------------------------------------------------

function saveScenarioCompletion(
  reflection = null
) {
  currentScenarioScore =
    calculateEmpathySafetyScore();

  const existing =
    progress.scenarios[
      selectedScenario.id
    ];

  const record = {
    id: selectedScenario.id,

    title:
      selectedScenario.title,

    score:
      currentScenarioScore,

    unsafeAttempts,

    metrics: {
      ...taskMetrics
    },

    caregiverChoice:
      selectedCaregiverChoice,

    feeling:
      selectedFeeling
        ? {
            id: selectedFeeling,
            label:
              feelingLabels[
                selectedFeeling
              ]
          }
        : existing?.feeling ||
          null,

    completedAt:
      new Date().toISOString(),

    reflection:
      reflection ||
      existing?.reflection ||
      null
  };

  progress.scenarios[
    selectedScenario.id
  ] = record;

  saveProgress();

  renderScenarios();
  renderProgressPanel();
}

// ---------------------------------------------------------
// TASK METRICS
// ---------------------------------------------------------

function updateTaskCondition(state) {
  const energy =
    taskMetrics.energy;

  taskEnergy.textContent =
    `${energy}%`;

  taskEnergyBar.style.width =
    `${energy}%`;

  taskEnergyBar.classList.toggle(
    "is-low",
    energy < 70
  );

  taskBalance.textContent =
    getBalanceLabel(
      taskMetrics.balance
    );

  taskPain.textContent =
    getKneePainLabel(
      taskMetrics.kneePain
    );

  taskConfidence.textContent =
    `${taskMetrics.confidence}%`;

  taskConfidenceBar.style.width =
    `${taskMetrics.confidence}%`;

  taskConfidenceBar.classList.toggle(
    "is-low",
    taskMetrics.confidence < 55
  );

  taskIndependence.textContent =
    `${taskMetrics.independence}%`;

  taskIndependenceBar.style.width =
    `${taskMetrics.independence}%`;

  taskIndependenceBar.classList.toggle(
    "is-low",
    taskMetrics.independence < 55
  );

  metricSafety.textContent =
    `${taskMetrics.safety}%`;

  metricPressure.textContent =
    getPressureLabel(
      taskMetrics.pressure
    );
}

function getPressureLabel(value) {
  if (value >= 75) {
    return "High";
  }

  if (value >= 45) {
    return "Medium";
  }

  return "Low";
}

function getBalanceLabel(value) {
  if (value >= 80) {
    return "Supported";
  }

  if (value >= 65) {
    return "Improved";
  }

  if (value >= 45) {
    return "Medium";
  }

  return "Low";
}

function getKneePainLabel(value) {
  if (value >= 85) {
    return "Very high";
  }

  if (value >= 65) {
    return "High";
  }

  if (value >= 40) {
    return "Moderate";
  }

  return "Low";
}

function clampMetric(value) {
  return Math.max(
    0,
    Math.min(100, value)
  );
}

function applyDecisionEffects(
  effects = {}
) {
  Object.entries(effects).forEach(
    ([metric, change]) => {
      taskMetrics[metric] =
        clampMetric(
          (taskMetrics[metric] || 0) +
          change
        );
    }
  );
}

function getInitialMetrics() {
  return {
    energy: 100,
    balance: 55,
    kneePain: 70,
    safety: 100,
    empathy: 60,
    confidence: 65,
    independence: 60,

    pressure:
      selectedScenario
        ?.indicatorEffects
        ?.pressure || 50,

    ...(
      selectedScenario
        ?.indicatorEffects
        ?.initialState || {}
    )
  };
}

// ---------------------------------------------------------
// SCENARIO CONTENT
// ---------------------------------------------------------

function loadScenarioTask() {
  if (!selectedScenario) {
    return;
  }

  taskEyebrow.textContent =
    selectedScenario.taskEyebrow;

  taskTitle.textContent =
    selectedScenario.taskTitle;

  taskDescription.textContent =
    selectedScenario.taskDescription;

  actionLabels.stool.textContent =
    selectedScenario.actions.stool;

  actionLabels.walker.textContent =
    selectedScenario.actions.walker;

  actionLabels.kettle.textContent =
    selectedScenario.actions.kettle;

  kitchenSim.dataset.scene =
    selectedScenario.id;
}

function renderScenarioReadup() {
  if (!selectedScenario) {
    return;
  }

  readupTitle.textContent =
    selectedScenario.title;

  readupContext.textContent =
    selectedScenario.context ||
    selectedScenario.description;

  readupChallengeTags.innerHTML =
    (
      selectedScenario.challengeTags ||
      []
    )
      .map(
        (tag) =>
          `<span class="tag">${tag}</span>`
      )
      .join("");

  readupObjective.textContent =
    selectedScenario.learningObjective;

  readupPoints.innerHTML =
    (
      selectedScenario.learningPoints ||
      []
    )
      .map(
        (point, index) => `
          <div>
            <strong>
              ${String(index + 1).padStart(2, "0")}
            </strong>

            <span>
              ${point}
            </span>
          </div>
        `
      )
      .join("");
}

function startSelectedScenario() {
  if (!selectedScenario) {
    return;
  }

  loadScenarioTask();
  resetTask();
  showScreen("task");
}

// ---------------------------------------------------------
// SCENARIO CARDS
// ---------------------------------------------------------

function renderScenarios() {
  if (!scenarios.length) {
    scenarioGrid.innerHTML = `
      <div class="scenario-load-help">
        <a
          class="button primary"
          href="/?v=feedback-framing&screen=decision"
        >
          Open scenarios
        </a>
      </div>
    `;

    return;
  }

  scenarioGrid.innerHTML =
    scenarios
      .map(
        (scenario, index) => {
          const record =
            progress.scenarios[
              scenario.id
            ];

          const progressLabel =
            record
              ? `Completed - ${record.score}%`
              : scenario.status;

          return `
            <button
              class="choice scenario-choice${
                scenario.available
                  ? ""
                  : " is-disabled"
              }"
              type="button"
              data-scenario="${index}"
              ${
                scenario.available
                  ? ""
                  : "disabled"
              }
            >
              <strong>
                ${scenario.title}
              </strong>

              <span>
                ${scenario.description}
              </span>

              <em>
                ${progressLabel}
              </em>
            </button>
          `;
        }
      )
      .join("");
}

async function selectScenario(index) {
  const scenario =
    scenarios[index];

  if (!scenario.available) {
    return;
  }

  try {
    selectedScenario =
      await loadScenarioById(
        scenario.id
      );

    renderScenarioReadup();

    showScreen("readup");
  } catch (error) {
    simStatus.textContent =
      error.message;

    simStatus.className =
      "sim-status is-warning";
  }
}

// ---------------------------------------------------------
// FEEDBACK
// ---------------------------------------------------------

function showScenarioFeedback() {
  document.querySelector(
    "#feedbackTitle"
  ).textContent =
    selectedScenario.feedbackTitle;

  document.querySelector(
    "#feedbackBody"
  ).textContent =
    selectedScenario.feedback;

  document.querySelector(
    "#impactList"
  ).innerHTML =
    renderImpactGroups(
      selectedScenario.impacts
    );

  selectedFeeling = null;

  feedbackReveal.hidden = true;

  feelingOptions
    .querySelectorAll(
      "[data-feeling]"
    )
    .forEach((button) => {
      button.classList.remove(
        "is-selected"
      );
    });

  showScreen("feedback");
}

function handleFeelingChoice(
  feelingId
) {
  selectedFeeling = feelingId;

  feelingOptions
    .querySelectorAll(
      "[data-feeling]"
    )
    .forEach((button) => {
      button.classList.toggle(
        "is-selected",
        button.dataset.feeling ===
          feelingId
      );
    });

  renderScorePanel();

  feedbackReveal.hidden = false;

  saveScenarioCompletion();
}

function renderImpactGroups(
  impacts
) {
  const groups =
    impacts.reduce(
      (result, impact) => {
        const isAdvantage =
          impact.startsWith(
            "Advantage:"
          );

        const cleanText =
          impact.replace(
            /^(Advantage|Disadvantage):\s*/,
            ""
          );

        result[
          isAdvantage
            ? "advantages"
            : "disadvantages"
        ].push(cleanText);

        return result;
      },
      {
        advantages: [],
        disadvantages: []
      }
    );

  return `
    <section
      class="impact-group impact-group-good"
      aria-label="Advantages"
    >
      <div class="impact-group-head">
        <span class="impact-icon">
          +
        </span>

        <h3>
          Advantages
        </h3>
      </div>

      <div class="impact-row">
        ${groups.advantages
          .map(
            (impact) =>
              `<div class="impact-item">${impact}</div>`
          )
          .join("")}
      </div>
    </section>

    <section
      class="impact-group impact-group-caution"
      aria-label="Disadvantages"
    >
      <div class="impact-group-head">
        <span class="impact-icon">
          !
        </span>

        <h3>
          Disadvantages
        </h3>
      </div>

      <div class="impact-row">
        ${groups.disadvantages
          .map(
            (impact) =>
              `<div class="impact-item">${impact}</div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

// ---------------------------------------------------------
// TASK RESET
// ---------------------------------------------------------

function resetTask() {
  if (!selectedScenario) {
    return;
  }

  taskRunToken += 1;

  taskStep = 0;
  unsafeAttempts = 0;
  currentScenarioScore = 0;

  taskMetrics =
    getInitialMetrics();

  selectedCaregiverChoice =
    null;

  simStatus.textContent =
    "First, inspect the scene and choose what to do.";

  simStatus.className =
    "sim-status";

  kitchenSim.className =
    `kitchen-sim scene-${selectedScenario.id}`;

  simEffect.textContent = "";

  movementProgress.hidden =
    true;

  movementProgressBar.style.transition =
    "none";

  movementProgressBar.style.width =
    "0%";

  updateTaskCondition("start");

  document.querySelector(
    "#unsafeAttempts"
  ).textContent =
    unsafeAttempts;

  continueDecisionButton.disabled =
    true;

  caregiverChoicePanel.hidden =
    true;

  caregiverResult.textContent =
    "";

  renderCaregiverOptions();

  simObjects.forEach(
    (object) => {
      object.disabled = false;

      object.blur();

      object.classList.remove(
        "is-done",
        "is-risk"
      );

      object.removeAttribute(
        "aria-disabled"
      );
    }
  );
}

// ---------------------------------------------------------
// MOVEMENT
// ---------------------------------------------------------

function getMovementDelay() {
  const painFactor =
    (taskMetrics.kneePain || 0) /
    100;

  const balanceFactor =
    (
      100 -
      (taskMetrics.balance || 0)
    ) / 100;

  const delay =
    650 +
    painFactor * 750 +
    balanceFactor * 450;

  return Math.round(
    Math.min(
      1700,
      Math.max(650, delay)
    )
  );
}

const movementMessages = [
  "I move slowly. No rushing today.",
  "Still taking it carefully, one step at a time.",
  "Almost there. I'll finish at my own pace."
];

function getMovementMessage() {
  return movementMessages[
    Math.min(
      taskStep,
      movementMessages.length - 1
    )
  ];
}

function lockTaskInputs() {
  simObjects.forEach(
    (object) => {
      object.disabled = true;
    }
  );
}

function unlockTaskInputs() {
  simObjects.forEach(
    (object) => {
      if (
        !object.classList.contains(
          "is-done"
        )
      ) {
        object.disabled = false;
      }
    }
  );
}

// ---------------------------------------------------------
// UNSAFE ACTIONS
// ---------------------------------------------------------

function setTaskWarning(action) {
  const object =
    document.querySelector(
      `[data-sim-action="${action}"]`
    );

  const sceneEffect =
    selectedScenario
      .indicatorEffects
      ?.sceneEffects
      ?.[action] ||
    unsafeSceneEffects[
      selectedScenario.id
    ]?.[action] ||
    {
      className:
        "unsafe-fall",
      label:
        "Unsafe move"
    };

  unsafeAttempts += 1;

  document.querySelector(
    "#unsafeAttempts"
  ).textContent =
    unsafeAttempts;

  applyDecisionEffects(
    selectedScenario
      .indicatorEffects
      ?.decisions
      ?.unsafe
      ?.[action]
  );

  simStatus.textContent =
    `Incorrect: ${getTaskWarning(action)}`;

  simStatus.className =
    "sim-status is-warning";

  updateTaskCondition(
    "unsafe"
  );

  object.classList.remove(
    "is-risk"
  );

  clearUnsafeSceneClasses();

  simEffect.textContent =
    sceneEffect.label;

  requestAnimationFrame(() => {
    object.classList.add(
      "is-risk"
    );

    kitchenSim.classList.add(
      "is-risk",
      sceneEffect.className
    );
  });

  lockTaskInputs();

  const runToken =
    taskRunToken;

  setTimeout(() => {
    if (
      runToken !==
      taskRunToken
    ) {
      return;
    }

    unlockTaskInputs();
  }, 900);
}

function getTaskWarning(action) {
  const contextualKey =
    `${taskStep}:${action}`;

  return (
    selectedScenario
      .contextualWarnings
      ?.[contextualKey] ||
    selectedScenario
      .warnings[action]
  );
}

function clearUnsafeSceneClasses() {
  kitchenSim.classList.remove(
    "is-risk",
    "unsafe-reach",
    "unsafe-bump",
    "unsafe-fall",
    "unsafe-spill",
    "unsafe-fatigue",
    "unsafe-dark",
    "unsafe-rush"
  );
}

// ---------------------------------------------------------
// TASK ACTIONS
// ---------------------------------------------------------

function handleTaskAction(action) {
  const expected =
    taskSequence[taskStep];

  if (action !== expected) {
    setTaskWarning(action);
    return;
  }

  const object =
    document.querySelector(
      `[data-sim-action="${action}"]`
    );

  clearUnsafeSceneClasses();

  simEffect.textContent = "";

  simObjects.forEach(
    (simObject) =>
      simObject.classList.remove(
        "is-risk"
      )
  );

  const delay =
    getMovementDelay();

  const runToken =
    taskRunToken;

  lockTaskInputs();

  simStatus.textContent =
    getMovementMessage();

  simStatus.className =
    "sim-status is-waiting";

  movementProgress.hidden =
    false;

  movementProgressBar.style.transition =
    "none";

  movementProgressBar.style.width =
    "0%";

  requestAnimationFrame(() => {
    movementProgressBar.style.transition =
      `width ${delay}ms linear`;

    movementProgressBar.style.width =
      "100%";
  });

  setTimeout(() => {
    if (
      runToken !==
      taskRunToken
    ) {
      return;
    }

    movementProgress.hidden =
      true;

    object.classList.add(
      "is-done"
    );

    object.disabled =
      true;

    taskStep += 1;

    applyDecisionEffects(
      selectedScenario
        .indicatorEffects
        ?.decisions
        ?.safe
        ?.[action]
    );

    updateTaskCondition(
      action
    );

    if (action === "stool") {
      kitchenSim.classList.add(
        "step-stool-cleared"
      );
    }

    if (action === "walker") {
      kitchenSim.classList.add(
        "step-using-walker"
      );
    }

    if (action === "kettle") {
      kitchenSim.classList.add(
        "step-at-kettle"
      );
    }

    if (
      taskStep ===
      taskSequence.length
    ) {
      simStatus.textContent =
        `${selectedScenario.completion} Now choose how the caregiver should respond.`;

      simStatus.className =
        "sim-status is-success";

      caregiverChoicePanel.hidden =
        false;

      currentScenarioScore =
        calculateEmpathySafetyScore();

      return;
    }

    unlockTaskInputs();

    simStatus.textContent =
      `Correct: ${selectedScenario.correctReasons[action]} What would you do next?`;

    simStatus.className =
      "sim-status";
  }, delay);
}

// ---------------------------------------------------------
// CAREGIVER OPTIONS
// ---------------------------------------------------------

function renderCaregiverOptions() {
  caregiverOptions.innerHTML =
    caregiverResponses
      .map(
        (response) => `
          <button
            class="caregiver-option"
            type="button"
            data-caregiver-choice="${response.id}"
          >
            <span class="option-icon">
              ${response.icon}
            </span>

            <span class="option-copy">
              <strong>
                ${response.label}
              </strong>

              <span>
                ${response.description}
              </span>
            </span>

            <span class="option-impact">
              ${response.impact
                .map(
                  (impact) =>
                    `<em>${impact}</em>`
                )
                .join("")}
            </span>
          </button>
        `
      )
      .join("");
}

function handleCaregiverChoice(
  choiceId
) {
  const response =
    caregiverResponses.find(
      (item) =>
        item.id === choiceId
    );

  if (!response) {
    return;
  }

  selectedCaregiverChoice = {
    id: response.id,
    label: response.label,
    result: response.result
  };

  applyDecisionEffects(
    selectedScenario
      .indicatorEffects
      ?.caregiver
      ?.[response.id]
  );

  updateTaskCondition(
    "kettle"
  );

  caregiverResult.innerHTML = `
    <strong>
      ${response.result}
    </strong>

    <span>
      Now view feedback.
    </span>
  `;

  caregiverOptions
    .querySelectorAll(
      "[data-caregiver-choice]"
    )
    .forEach(
      (button) => {
        const isSelected =
          button.dataset
            .caregiverChoice ===
          choiceId;

        button.classList.toggle(
          "is-selected",
          isSelected
        );
      }
    );

  continueDecisionButton.disabled =
    false;

  currentScenarioScore =
    calculateEmpathySafetyScore();

  saveScenarioCompletion();
}

// ---------------------------------------------------------
// CLICK EVENTS
// ---------------------------------------------------------

document.addEventListener(
  "click",
  (event) => {
    const goButton =
      event.target.closest(
        "[data-go]"
      );

    const scenarioButton =
      event.target.closest(
        "[data-scenario]"
      );

    const simButton =
      event.target.closest(
        "[data-sim-action]"
      );

    const caregiverButton =
      event.target.closest(
        "[data-caregiver-choice]"
      );

    const feelingButton =
      event.target.closest(
        "[data-feeling]"
      );

    const stepButton =
      event.target.closest(
        "[data-step-dot]"
      );

    const modalButton =
      event.target.closest(
        "[data-open-modal]"
      );

    const closeModal =
      event.target.closest(
        "[data-close-modal]"
      );

    if (goButton) {
      showScreen(
        goButton.dataset.go
      );
    }

    if (scenarioButton) {
      selectScenario(
        Number(
          scenarioButton.dataset.scenario
        )
      );
    }

    if (simButton) {
      handleTaskAction(
        simButton.dataset.simAction
      );
    }

    if (caregiverButton) {
      handleCaregiverChoice(
        caregiverButton.dataset
          .caregiverChoice
      );
    }

    if (feelingButton) {
      handleFeelingChoice(
        feelingButton.dataset.feeling
      );
    }

    if (stepButton) {
      goToPreviousStep(
        stepButton.dataset.stepDot
      );
    }

    if (modalButton) {
      aboutModal.showModal();
    }

    if (closeModal) {
      aboutModal.close();
    }
  }
);

// ---------------------------------------------------------
// BUTTON EVENTS
// ---------------------------------------------------------

resetTaskButton.addEventListener(
  "click",
  resetTask
);

continueDecisionButton.addEventListener(
  "click",
  showScenarioFeedback
);

startScenarioButton.addEventListener(
  "click",
  startSelectedScenario
);

// IMPORTANT:
// Reset now clears ONLY this participant's progress.
resetProgressButton.addEventListener(
  "click",
  async () => {
    progress = {
      scenarios: {}
    };

    localStorage.setItem(
      progressStorageKey,
      JSON.stringify(progress)
    );

    await clearProgressFromBackend();

    renderScenarios();
    renderProgressPanel();
  }
);

// ---------------------------------------------------------
// REFLECTION
// ---------------------------------------------------------

reflectionForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const formData =
      new FormData(
        reflectionForm
      );

    const difficulty =
      formData
        .get("difficulty")
        .toString()
        .trim();

    const support =
      formData
        .get("support")
        .toString()
        .trim();

    saveScenarioCompletion({
      difficulty,
      support
    });

    const stats =
      getProgressStats();

    reflectionOutput.innerHTML = `
      <div class="summary-section-head">
        <span class="summary-dot">
          R
        </span>

        <h3>
          Your reflection
        </h3>
      </div>

      <div class="reflection-mini-grid">

        <div>
          <span>
            Hardest part
          </span>

          <strong>
            ${difficulty}
          </strong>
        </div>

        <div>
          <span>
            Support idea
          </span>

          <strong>
            ${support}
          </strong>
        </div>

        <div>
          <span>
            Scenario
          </span>

          <strong>
            ${selectedScenario.title}
          </strong>
        </div>

      </div>
    `;

    caregiverInsightOutput.innerHTML = `
      <div class="summary-section-head">
        <span class="summary-dot">
          C
        </span>

        <h3>
          Caregiver takeaway
        </h3>
      </div>

      <div class="takeaway-card">
        <strong>
          Recommended support
        </strong>

        <p>
          ${selectedScenario.insight}
        </p>
      </div>

      <div class="takeaway-strip">
        <span>Safety</span>
        <span>Dignity</span>
        <span>Independence</span>
      </div>
    `;

    progressOutput.innerHTML = `
      <div class="summary-section-head">
        <span class="summary-dot">
          P
        </span>

        <h3>
          Progress
        </h3>
      </div>

      <div class="progress-summary">

        <div>
          <span>
            ${stats.completed}/${stats.total}
          </span>

          <p>
            scenarios completed
          </p>
        </div>

        <div>
          <span>
            ${stats.average}%
          </span>

          <p>
            average outcome score
          </p>
        </div>

      </div>

      <div
        class="summary-progress-bar"
        aria-hidden="true"
      >
        <span
          style="width: ${stats.average}%"
        ></span>
      </div>
    `;

    showScreen(
      "summary"
    );
  }
);

// ---------------------------------------------------------
// INITIALISE APP
// ---------------------------------------------------------

async function initializeApp() {
  renderProgressPanel();

  try {
    await loadScenarioList();
  } catch (error) {
    scenarioGrid.innerHTML = `
      <div class="impact-item">
        Scenarios could not be loaded.
        Please run the Node server
        and refresh the page.
      </div>
    `;
  }

  await loadProgressFromBackend();

  const requestedScreen =
    new URLSearchParams(
      window.location.search
    ).get("screen");

  showScreen(
    screenOrder.includes(
      requestedScreen
    )
      ? requestedScreen
      : "home"
  );
}

initializeApp();