/**
 * Orchestrator for specialized QA agents
 * Runs individual agents or workflows based on configuration
 *
 * Usage:
 *   npx ts-node agents/runner.ts --agent data-integrity --filePaths="aiadaptation.xml"
 *   npx ts-node agents/runner.ts --workflow pr
 *   npx ts-node agents/runner.ts --agent all
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AgentConfig {
  enabled: boolean;
  priority: string;
  runOn: string[];
  description: string;
  timeout: number;
  defaultParams: Record<string, unknown>;
  blockingThreshold: string;
}

interface AgentsConfig {
  agents: Record<string, AgentConfig>;
  workflows: Record<
    string,
    {
      agents: string[];
      failFast: boolean;
      minScore: number;
      manual?: boolean;
      schedule?: string;
    }
  >;
  severityMap: Record<string, Record<string, Record<string, unknown>>>;
  notifications: Record<string, unknown>;
  reporting: Record<string, unknown>;
}

// Load configuration
const configPath = path.join(__dirname, "config.json");
const config: AgentsConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Parse CLI arguments
const args = process.argv.slice(2);
const options: Record<string, string | boolean> = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const raw = args[i].substring(2);
    const equalsIndex = raw.indexOf("=");

    if (equalsIndex > -1) {
      const key = raw.slice(0, equalsIndex);
      const value = raw.slice(equalsIndex + 1);
      options[key] = value;
      continue;
    }

    const key = raw;
    if (args[i + 1] && !args[i + 1].startsWith("--")) {
      options[key] = args[i + 1];
      i++;
    } else {
      options[key] = true;
    }
  }
}

const agentName = (options.agent as string) || "";
const workflowName = (options.workflow as string) || "";

interface AgentResult {
  agent: string;
  status: "pass" | "degrade" | "fail" | string;
  timestamp: string;
  duration: number;
  output: Record<string, unknown>;
}

interface DocsDriftIssue {
  severity: "major" | "minor";
  type: string;
  file?: string;
  message: string;
  fix: string;
}

function toStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

function resolveInputPath(repositoryRoot: string, inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  return path.join(repositoryRoot, normalizeRelativePath(inputPath));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "#text" in value &&
    typeof (value as { "#text": unknown })["#text"] === "string"
  ) {
    const parsed = Number.parseFloat((value as { "#text": string })["#text"]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function linearRegression(
  xValues: number[],
  yValues: number[],
): { slope: number; intercept: number; r2: number } | null {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    return null;
  }

  const n = xValues.length;
  const meanX = xValues.reduce((sum, value) => sum + value, 0) / n;
  const meanY = yValues.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const dx = xValues[i] - meanX;
    numerator += dx * (yValues[i] - meanY);
    denominator += dx * dx;
  }

  if (denominator === 0) {
    return null;
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  const predicted = xValues.map((value) => intercept + slope * value);
  const ssRes = yValues.reduce(
    (sum, value, index) => sum + (value - predicted[index]) ** 2,
    0,
  );
  const ssTot = yValues.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`, "i");
}

function runDataIntegrityChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");
  const filePaths = toStringArray(params.filePaths);

  const violations: Array<{
    severity: "critical" | "warning";
    category: "schema" | "structure" | "input";
    file?: string;
    issue: string;
    fix: string;
  }> = [];

  if (filePaths.length === 0) {
    violations.push({
      severity: "warning",
      category: "input",
      issue: "No input files provided.",
      fix: 'Pass one or more files with --filePaths="path/to/file1,path/to/file2".',
    });
  }

  for (const inputPath of filePaths) {
    const normalizedPath = normalizeRelativePath(inputPath);
    const absolutePath = resolveInputPath(repositoryRoot, normalizedPath);

    if (!fs.existsSync(absolutePath)) {
      violations.push({
        severity: "critical",
        category: "input",
        file: normalizedPath,
        issue: "File does not exist.",
        fix: "Verify path and provide an existing file.",
      });
      continue;
    }

    const extension = path.extname(absolutePath).toLowerCase();
    let content = "";

    try {
      content = fs.readFileSync(absolutePath, "utf-8");
    } catch {
      violations.push({
        severity: "critical",
        category: "input",
        file: normalizedPath,
        issue: "Unable to read file as UTF-8 text.",
        fix: "Ensure the file is readable and encoded as UTF-8.",
      });
      continue;
    }

    if (extension === ".json") {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          violations.push({
            severity: "critical",
            category: "structure",
            file: normalizedPath,
            issue: "JSON root must be an object.",
            fix: "Ensure JSON top-level type is an object.",
          });
        }

        const maybeClasses = parsed.classes;
        const maybeTracks = parsed.tracks;

        if (
          maybeClasses !== undefined &&
          (typeof maybeClasses !== "object" || maybeClasses === null)
        ) {
          violations.push({
            severity: "warning",
            category: "schema",
            file: normalizedPath,
            issue: "Property 'classes' exists but is not a valid object.",
            fix: "Align structure with r3e-data.json expectations.",
          });
        }

        if (
          maybeTracks !== undefined &&
          (typeof maybeTracks !== "object" || maybeTracks === null)
        ) {
          violations.push({
            severity: "warning",
            category: "schema",
            file: normalizedPath,
            issue: "Property 'tracks' exists but is not a valid object.",
            fix: "Align structure with r3e-data.json expectations.",
          });
        }
      } catch {
        violations.push({
          severity: "critical",
          category: "structure",
          file: normalizedPath,
          issue: "Invalid JSON syntax.",
          fix: "Fix JSON syntax errors before processing.",
        });
      }
    } else if (extension === ".xml") {
      const hasXmlMarkers = /<[^>]+>/.test(content);
      if (!hasXmlMarkers) {
        violations.push({
          severity: "critical",
          category: "structure",
          file: normalizedPath,
          issue: "File does not look like valid XML content.",
          fix: "Provide a valid XML file (e.g. aiadaptation.xml).",
        });
      }
    } else if (extension === ".txt") {
      if (content.trim().length === 0) {
        violations.push({
          severity: "warning",
          category: "structure",
          file: normalizedPath,
          issue: "Text file is empty.",
          fix: "Provide a non-empty race result file.",
        });
      }
    } else {
      violations.push({
        severity: "warning",
        category: "input",
        file: normalizedPath,
        issue: `Unsupported extension '${extension || "(none)"}'.`,
        fix: "Use .xml, .json, or .txt files.",
      });
    }
  }

  const criticalCount = violations.filter(
    (v) => v.severity === "critical",
  ).length;
  const warningCount = violations.filter(
    (v) => v.severity === "warning",
  ).length;

  const status: "pass" | "degrade" | "fail" =
    criticalCount > 0 ? "fail" : warningCount > 0 ? "degrade" : "pass";

  return {
    status,
    output: {
      description: "Input schema and structure checks",
      checkedFiles: filePaths,
      violations,
      summary: {
        totalFiles: filePaths.length,
        criticalCount,
        warningCount,
      },
    },
  };
}

function runParserResilienceChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");
  const parserModules = toStringArray(params.parserModules);
  const testDataPathRaw =
    typeof params.testDataPath === "string" ? params.testDataPath : "";
  const regressionDatasetRaw =
    typeof params.regressionDataset === "string"
      ? params.regressionDataset
      : "";

  const missingParsers: string[] = [];
  const parserChecks: Array<{ module: string; exists: boolean; path: string }> =
    [];

  for (const parserModule of parserModules) {
    const parserPath = path.join(repositoryRoot, "src", "utils", parserModule);
    const exists = fs.existsSync(parserPath);
    parserChecks.push({ module: parserModule, exists, path: parserPath });

    if (!exists) {
      missingParsers.push(parserModule);
    }
  }

  const warnings: string[] = [];

  let testDataStats: {
    path: string;
    exists: boolean;
    fileCount: number;
  } = {
    path: testDataPathRaw,
    exists: false,
    fileCount: 0,
  };

  if (testDataPathRaw) {
    const absoluteTestPath = resolveInputPath(repositoryRoot, testDataPathRaw);
    const exists = fs.existsSync(absoluteTestPath);
    testDataStats = {
      path: normalizeRelativePath(testDataPathRaw),
      exists,
      fileCount: 0,
    };

    if (exists) {
      const entries = fs.readdirSync(absoluteTestPath, { withFileTypes: true });
      const fileCount = entries.filter((entry) => entry.isFile()).length;
      testDataStats.fileCount = fileCount;

      if (fileCount === 0) {
        warnings.push("testDataPath exists but contains no files.");
      }
    } else {
      warnings.push("testDataPath not found.");
    }
  }

  let regressionDataset: {
    path: string;
    exists: boolean;
  } | null = null;

  if (regressionDatasetRaw) {
    const absoluteDatasetPath = resolveInputPath(
      repositoryRoot,
      regressionDatasetRaw,
    );
    const exists = fs.existsSync(absoluteDatasetPath);
    regressionDataset = {
      path: normalizeRelativePath(regressionDatasetRaw),
      exists,
    };

    if (!exists) {
      warnings.push("regressionDataset provided but file not found.");
    }
  }

  const status: "pass" | "degrade" | "fail" =
    missingParsers.length > 0
      ? "fail"
      : warnings.length > 0
        ? "degrade"
        : "pass";

  return {
    status,
    output: {
      description: "Parser module presence and fixture readiness checks",
      parserChecks,
      missingParsers,
      testDataPath: testDataStats,
      regressionDataset,
      warnings,
    },
  };
}

function runFittingQaChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");
  const aiadaptationXml =
    typeof params.aiadaptationXml === "string" ? params.aiadaptationXml : "";

  const inputPath = resolveInputPath(repositoryRoot, aiadaptationXml);
  if (!aiadaptationXml || !fs.existsSync(inputPath)) {
    return {
      status: "fail",
      output: {
        description: "Fitting quality checks",
        error: "Input aiadaptation.xml not found.",
        file: aiadaptationXml,
      },
    };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const xmlText = fs.readFileSync(inputPath, "utf-8");

  let parsed: unknown;
  try {
    parsed = parser.parse(xmlText);
  } catch {
    return {
      status: "fail",
      output: {
        description: "Fitting quality checks",
        error: "Invalid XML format.",
        file: aiadaptationXml,
      },
    };
  }

  const root = parsed as {
    AiAdaptation?: {
      aiAdaptationData?: {
        layoutId?: unknown[] | unknown;
        value?: unknown[] | unknown;
      };
    };
  };

  const trackList = root.AiAdaptation?.aiAdaptationData;
  const layoutIds = toArray(trackList?.layoutId);
  const values = toArray(trackList?.value);

  if (
    layoutIds.length === 0 ||
    values.length === 0 ||
    layoutIds.length !== values.length
  ) {
    return {
      status: "fail",
      output: {
        description: "Fitting quality checks",
        error: "XML structure missing aiAdaptationData layout/value pairs.",
      },
    };
  }

  let combosChecked = 0;
  const monotonicViolations: Array<{
    trackId: string;
    classId: string;
    aiLow: number;
    aiHigh: number;
    timeLow: number;
    timeHigh: number;
  }> = [];
  const slopeViolations: Array<{
    trackId: string;
    classId: string;
    slope: number;
  }> = [];
  const regressionR2: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const trackId = String(layoutIds[i]);
    const trackValue = values[i] as {
      carClassId?: unknown[] | unknown;
      sampledData?: unknown[] | unknown;
    };

    const classIds = toArray(trackValue?.carClassId);
    const sampledData = toArray(trackValue?.sampledData);
    const pairCount = Math.min(classIds.length, sampledData.length);

    for (let j = 0; j < pairCount; j++) {
      const classId = String(classIds[j]);
      const sampled = sampledData[j] as {
        aiSkillVsLapTimes?: {
          aiSkill?: unknown[] | unknown;
          aiData?: unknown[] | unknown;
        };
      };

      const aiBlock = sampled?.aiSkillVsLapTimes;
      const aiSkills = toArray(aiBlock?.aiSkill);
      const aiData = toArray(aiBlock?.aiData);
      const dataPairs = Math.min(aiSkills.length, aiData.length);

      const points: Array<{ ai: number; time: number }> = [];

      for (let k = 0; k < dataPairs; k++) {
        const ai = toNumber(aiSkills[k]);
        const time = toNumber(
          (aiData[k] as { averagedLapTime?: unknown })?.averagedLapTime,
        );
        if (ai !== null && time !== null) {
          points.push({ ai, time });
        }
      }

      if (points.length < 2) {
        continue;
      }

      combosChecked++;
      points.sort((left, right) => left.ai - right.ai);

      for (let k = 1; k < points.length; k++) {
        const previous = points[k - 1];
        const current = points[k];
        if (current.time > previous.time) {
          monotonicViolations.push({
            trackId,
            classId,
            aiLow: previous.ai,
            aiHigh: current.ai,
            timeLow: previous.time,
            timeHigh: current.time,
          });
        }
      }

      const regression = linearRegression(
        points.map((point) => point.ai),
        points.map((point) => point.time),
      );
      if (!regression) {
        continue;
      }

      regressionR2.push(regression.r2);
      if (regression.slope >= 0) {
        slopeViolations.push({ trackId, classId, slope: regression.slope });
      }
    }
  }

  const avgR2 =
    regressionR2.length > 0
      ? regressionR2.reduce((sum, value) => sum + value, 0) /
        regressionR2.length
      : null;

  const violationRatio = combosChecked
    ? (monotonicViolations.length + slopeViolations.length) / combosChecked
    : 1;

  const status: "pass" | "degrade" | "fail" =
    combosChecked === 0
      ? "degrade"
      : violationRatio > 0.1
        ? "fail"
        : monotonicViolations.length > 0 || slopeViolations.length > 0
          ? "degrade"
          : "pass";

  return {
    status,
    output: {
      description: "Fitting quality checks",
      file: normalizeRelativePath(aiadaptationXml),
      combosChecked,
      note:
        combosChecked === 0
          ? "No track/class combinations with at least 2 AI data points were found."
          : undefined,
      monotonicity: {
        violations: monotonicViolations.length,
        details: monotonicViolations.slice(0, 20),
      },
      slopeValidation: {
        violations: slopeViolations.length,
        details: slopeViolations.slice(0, 20),
      },
      regression: {
        avgR2,
        sampleCount: regressionR2.length,
      },
    },
  };
}

function runResultsConsistencyChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");
  const resultsPathRaw =
    typeof params.resultsPath === "string" ? params.resultsPath : "";
  const sessionPatternRaw =
    typeof params.sessionPattern === "string" ? params.sessionPattern : "*";
  const strictMatching =
    params.strictMatching === true || params.strictMatching === "true";

  const absoluteResultsPath = resolveInputPath(repositoryRoot, resultsPathRaw);
  if (!resultsPathRaw || !fs.existsSync(absoluteResultsPath)) {
    return {
      status: "degrade",
      output: {
        description: "Race results session consistency checks",
        warning: "resultsPath not found; no sessions analyzed.",
        resultsPath: normalizeRelativePath(resultsPathRaw),
      },
    };
  }

  const entries = fs.readdirSync(absoluteResultsPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(txt|json)$/i.test(name));

  const sessionPattern = wildcardToRegex(sessionPatternRaw);
  const grouped = new Map<
    string,
    { practice: number; qualify: number; race: number; files: string[] }
  >();

  let ignoredFiles = 0;
  const unknownNames: string[] = [];
  const nameRegex =
    /^(\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2})_(Practice|Qualify|Race\d+)\.(txt|json)$/i;

  for (const file of files) {
    const match = file.match(nameRegex);
    if (!match) {
      unknownNames.push(file);
      continue;
    }

    const sessionId = match[1];
    if (!sessionPattern.test(sessionId)) {
      ignoredFiles++;
      continue;
    }

    const sessionType = match[2].toLowerCase();
    const group = grouped.get(sessionId) || {
      practice: 0,
      qualify: 0,
      race: 0,
      files: [],
    };

    group.files.push(file);
    if (sessionType === "practice") {
      group.practice++;
    } else if (sessionType === "qualify") {
      group.qualify++;
    } else {
      group.race++;
    }

    grouped.set(sessionId, group);
  }

  const issues: Array<{
    sessionId: string;
    type: "orphaned_race" | "orphaned_qualify";
    severity: "warning" | "info";
    issue: string;
  }> = [];

  let totalSessions = 0;
  let orphanedRace = 0;
  let orphanedQualify = 0;

  for (const [sessionId, group] of grouped.entries()) {
    totalSessions += group.practice + group.qualify + group.race;

    if (group.race > 0 && group.qualify === 0) {
      orphanedRace++;
      issues.push({
        sessionId,
        type: "orphaned_race",
        severity: "warning",
        issue: "Race session has no matching Qualify session.",
      });
    }

    if (group.qualify > 0 && group.race === 0) {
      orphanedQualify++;
      issues.push({
        sessionId,
        type: "orphaned_qualify",
        severity: "info",
        issue: "Qualify session has no matching Race session.",
      });
    }
  }

  const qualityBase = Math.max(totalSessions, 1);
  const dataQualityScore = Math.max(
    0,
    Math.round(((qualityBase - orphanedRace) / qualityBase) * 100),
  );

  const status: "pass" | "degrade" | "fail" =
    strictMatching && orphanedRace > 0
      ? "fail"
      : orphanedRace > 0 || unknownNames.length > 0
        ? "degrade"
        : "pass";

  return {
    status,
    output: {
      description: "Race results session consistency checks",
      resultsPath: normalizeRelativePath(resultsPathRaw),
      sessionPattern: sessionPatternRaw,
      summary: {
        totalSessions,
        groupedEvents: grouped.size,
        orphanedRace,
        orphanedQualify,
        ignoredFiles,
        unknownNameFiles: unknownNames.length,
      },
      dataQualityScore,
      issues: issues.slice(0, 100),
      unknownFiles: unknownNames.slice(0, 30),
    },
  };
}

function extractIpcMainHandleChannels(content: string): string[] {
  const channels: string[] = [];
  const regex = /ipcMain\.handle\(\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    channels.push(match[1]);
  }

  return Array.from(new Set(channels));
}

function extractIpcRendererInvokeChannels(content: string): string[] {
  const channels: string[] = [];
  const regex = /ipcRenderer\.invoke\(\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    channels.push(match[1]);
  }

  return Array.from(new Set(channels));
}

function extractExposedElectronMethods(content: string): string[] {
  const methods: string[] = [];
  const bridgeRegex =
    /contextBridge\.exposeInMainWorld\(\s*["']electron["']\s*,\s*\{([\s\S]*?)\}\s*\)/m;
  const bridgeMatch = content.match(bridgeRegex);

  if (!bridgeMatch) {
    return [];
  }

  const objectBody = bridgeMatch[1];
  const methodRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\(/g;
  let methodMatch: RegExpExecArray | null;

  while ((methodMatch = methodRegex.exec(objectBody)) !== null) {
    methods.push(methodMatch[1]);
  }

  return Array.from(new Set(methods));
}

function extractHookElectronMethodUsage(content: string): string[] {
  const methods: string[] = [];
  const regex = /globalThis\.electron\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]);
  }

  return Array.from(new Set(methods));
}

function runElectronIpcChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");

  const electronMainPathRaw =
    typeof params.electronMainPath === "string"
      ? params.electronMainPath
      : "electron/main.mjs";
  const preloadPathRaw =
    typeof params.preloadPath === "string"
      ? params.preloadPath
      : "electron/preload.cjs";
  const storeModulesPathRaw =
    typeof params.storeModulesPath === "string"
      ? params.storeModulesPath
      : "src/store/";

  const electronMainPath = resolveInputPath(
    repositoryRoot,
    electronMainPathRaw,
  );
  const preloadPath = resolveInputPath(repositoryRoot, preloadPathRaw);
  const useElectronApiPath = resolveInputPath(
    repositoryRoot,
    "src/hooks/useElectronAPI.ts",
  );
  const electronStoragePath = resolveInputPath(
    repositoryRoot,
    "src/store/electronStorage.ts",
  );
  const storeModulesPath = resolveInputPath(
    repositoryRoot,
    storeModulesPathRaw,
  );

  const missingFiles: string[] = [];
  for (const filePath of [
    electronMainPath,
    preloadPath,
    useElectronApiPath,
    electronStoragePath,
  ]) {
    if (!fs.existsSync(filePath)) {
      missingFiles.push(path.relative(repositoryRoot, filePath));
    }
  }

  if (missingFiles.length > 0) {
    return {
      status: "fail",
      output: {
        description: "Electron IPC and storage audit",
        error: "Required files are missing.",
        missingFiles,
      },
    };
  }

  const mainContent = fs.readFileSync(electronMainPath, "utf-8");
  const preloadContent = fs.readFileSync(preloadPath, "utf-8");
  const hookContent = fs.readFileSync(useElectronApiPath, "utf-8");
  const storageContent = fs.readFileSync(electronStoragePath, "utf-8");

  const mainChannels = extractIpcMainHandleChannels(mainContent);
  const preloadInvokedChannels =
    extractIpcRendererInvokeChannels(preloadContent);
  const exposedMethods = extractExposedElectronMethods(preloadContent);
  const hookMethods = extractHookElectronMethodUsage(hookContent);

  const missingMainHandlers = preloadInvokedChannels.filter(
    (channel) => !mainChannels.includes(channel),
  );

  const missingInHook = exposedMethods.filter(
    (method) => !hookMethods.includes(method) && !method.startsWith("on"),
  );

  const missingInPreload = hookMethods.filter(
    (method) => !exposedMethods.includes(method),
  );

  const storeFilesUsingPersist: string[] = [];
  const storeFilesMissingGetStorage: string[] = [];

  if (fs.existsSync(storeModulesPath)) {
    const entries = fs.readdirSync(storeModulesPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith("Store.ts")) {
        continue;
      }

      const fullPath = path.join(storeModulesPath, entry.name);
      const content = fs.readFileSync(fullPath, "utf-8");
      if (/persist\s*\(/.test(content)) {
        storeFilesUsingPersist.push(entry.name);
        if (!/getStorage(?:<[^>]+>)?\s*\(/.test(content)) {
          storeFilesMissingGetStorage.push(entry.name);
        }
      }
    }
  }

  const hasSanitizeForIpcDefinition = /const\s+sanitizeForIPC\s*=/.test(
    storageContent,
  );
  const hasSanitizeUsage = /storeSet\([\s\S]*sanitizeForIPC\(/.test(
    storageContent,
  );

  const warnings: string[] = [];
  if (!hasSanitizeForIpcDefinition || !hasSanitizeUsage) {
    warnings.push(
      "sanitizeForIPC is missing or not used in electron store writes.",
    );
  }

  if (storeFilesUsingPersist.length === 0) {
    warnings.push("No persisted store files were detected for audit.");
  }

  const status: "pass" | "degrade" | "fail" =
    missingMainHandlers.length > 0 || missingInPreload.length > 0
      ? "fail"
      : missingInHook.length > 0 ||
          storeFilesMissingGetStorage.length > 0 ||
          warnings.length > 0
        ? "degrade"
        : "pass";

  return {
    status,
    output: {
      description: "Electron IPC and storage audit",
      ipcAudit: {
        mainHandleChannels: mainChannels.length,
        preloadInvokeChannels: preloadInvokedChannels.length,
        missingMainHandlers,
      },
      apiAudit: {
        exposedMethodsCount: exposedMethods.length,
        hookMethodsCount: hookMethods.length,
        missingInHook,
        missingInPreload,
      },
      storageAudit: {
        storeFilesUsingPersist,
        storeFilesMissingGetStorage,
        hasSanitizeForIpcDefinition,
        hasSanitizeUsage,
      },
      warnings,
    },
  };
}

function runReleaseChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");

  const changelogPathRaw =
    typeof params.changelogPath === "string"
      ? params.changelogPath
      : "CHANGELOG.md";
  const packageJsonPathRaw =
    typeof params.packageJsonPath === "string"
      ? params.packageJsonPath
      : "package.json";
  const releaseVersionRaw =
    typeof params.releaseVersion === "string"
      ? params.releaseVersion.trim()
      : "";
  const electronBuilderConfigRaw =
    typeof params.electronBuilderConfig === "string"
      ? params.electronBuilderConfig.trim()
      : "";
  const publishTarget =
    typeof params.publishTarget === "string" ? params.publishTarget : "unknown";

  const changelogPath = resolveInputPath(repositoryRoot, changelogPathRaw);
  const packageJsonPath = resolveInputPath(repositoryRoot, packageJsonPathRaw);
  const releasercPath = resolveInputPath(repositoryRoot, ".releaserc.json");
  const workflowPath = resolveInputPath(
    repositoryRoot,
    ".github/workflows/semantic-release.yml",
  );
  const electronBuilderConfigPath = electronBuilderConfigRaw
    ? resolveInputPath(repositoryRoot, electronBuilderConfigRaw)
    : null;

  const missingFiles: string[] = [];
  for (const filePath of [
    packageJsonPath,
    changelogPath,
    releasercPath,
    workflowPath,
  ]) {
    if (!fs.existsSync(filePath)) {
      missingFiles.push(path.relative(repositoryRoot, filePath));
    }
  }

  if (missingFiles.length > 0) {
    return {
      status: "fail",
      output: {
        description: "Release readiness checks",
        error: "Required release files are missing.",
        missingFiles,
      },
    };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
    version?: string;
    scripts?: Record<string, string>;
    build?: Record<string, unknown>;
    devDependencies?: Record<string, string>;
  };
  const changelogContent = fs.readFileSync(changelogPath, "utf-8");
  const releaserc = JSON.parse(fs.readFileSync(releasercPath, "utf-8")) as {
    branches?: string[];
    plugins?: unknown[];
  };
  const workflowContent = fs.readFileSync(workflowPath, "utf-8");

  const packageVersion =
    typeof packageJson.version === "string" ? packageJson.version : null;
  const targetVersion = releaseVersionRaw || packageVersion || "unknown";

  const warnings: string[] = [];
  const failures: string[] = [];

  const scripts = packageJson.scripts || {};
  if (!scripts.build) {
    failures.push("Missing npm script: build");
  }
  if (!scripts["build:electron"]) {
    failures.push("Missing npm script: build:electron");
  }
  if (!scripts.lint) {
    warnings.push("Missing npm script: lint");
  }

  const hasSemanticReleaseDependency = Boolean(
    packageJson.devDependencies?.["semantic-release"],
  );
  if (!hasSemanticReleaseDependency) {
    failures.push("semantic-release is not listed in devDependencies.");
  }

  const releaseBranches = Array.isArray(releaserc.branches)
    ? releaserc.branches
    : [];
  if (!releaseBranches.includes("master")) {
    failures.push(".releaserc.json does not include 'master' in branches.");
  }

  const hasCommitAnalyzer = JSON.stringify(releaserc.plugins || []).includes(
    "@semantic-release/commit-analyzer",
  );
  const hasChangelogPlugin = JSON.stringify(releaserc.plugins || []).includes(
    "@semantic-release/changelog",
  );
  const hasGithubPlugin = JSON.stringify(releaserc.plugins || []).includes(
    "@semantic-release/github",
  );

  if (!hasCommitAnalyzer) {
    failures.push("Missing @semantic-release/commit-analyzer plugin.");
  }
  if (!hasChangelogPlugin) {
    warnings.push("Missing @semantic-release/changelog plugin.");
  }
  if (!hasGithubPlugin) {
    failures.push("Missing @semantic-release/github plugin.");
  }

  const workflowHasMasterTrigger =
    /push:\s*[\s\S]*?branches:\s*[\s\S]*?-\s*master/i.test(workflowContent);
  const workflowRunsSemanticRelease = /run:\s*npx\s+semantic-release/i.test(
    workflowContent,
  );
  const workflowBuildsElectron = /run:\s*npm\s+run\s+build:electron/i.test(
    workflowContent,
  );
  const workflowUploadsLatestYml = /dist\/latest\.yml/i.test(workflowContent);
  const workflowUploadsBlockmap = /\.blockmap/i.test(workflowContent);

  if (!workflowHasMasterTrigger) {
    failures.push("semantic-release workflow is not triggered on master push.");
  }
  if (!workflowRunsSemanticRelease) {
    failures.push(
      "semantic-release workflow does not run 'npx semantic-release'.",
    );
  }
  if (!workflowBuildsElectron) {
    warnings.push("semantic-release workflow does not run build:electron.");
  }
  if (!workflowUploadsLatestYml || !workflowUploadsBlockmap) {
    warnings.push(
      "Release workflow may be missing auto-update assets (latest.yml/.blockmap).",
    );
  }

  const changelogHasTarget =
    targetVersion !== "unknown"
      ? new RegExp(
          `^#*\\s*\\[?${targetVersion.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\]?`,
          "m",
        ).test(changelogContent)
      : false;

  if (!changelogHasTarget) {
    warnings.push(
      `CHANGELOG.md does not contain an entry for version ${targetVersion}.`,
    );
  }

  if (
    releaseVersionRaw &&
    packageVersion &&
    releaseVersionRaw !== packageVersion
  ) {
    warnings.push(
      `Requested releaseVersion (${releaseVersionRaw}) differs from package.json version (${packageVersion}).`,
    );
  }

  const hasBuildPublishGithub =
    typeof packageJson.build === "object" &&
    packageJson.build !== null &&
    JSON.stringify(packageJson.build).includes('"provider":"github"');

  if (!hasBuildPublishGithub) {
    warnings.push(
      "electron-builder publish provider is not explicitly set to GitHub.",
    );
  }

  let electronBuilderConfigExists = null as boolean | null;
  if (electronBuilderConfigPath) {
    electronBuilderConfigExists = fs.existsSync(electronBuilderConfigPath);
    if (!electronBuilderConfigExists) {
      warnings.push(
        `Configured electronBuilderConfig file not found: ${normalizeRelativePath(electronBuilderConfigRaw)}.`,
      );
    }
  }

  const status: "pass" | "degrade" | "fail" =
    failures.length > 0 ? "fail" : warnings.length > 0 ? "degrade" : "pass";

  return {
    status,
    output: {
      description: "Release readiness checks",
      releaseVersion: targetVersion,
      publishTarget,
      electronBuilderConfig: {
        configuredPath: electronBuilderConfigRaw || null,
        exists: electronBuilderConfigExists,
      },
      versioningCheck: {
        packageJson: packageVersion,
        changelogEntryFound: changelogHasTarget,
      },
      semanticReleaseCheck: {
        branches: releaseBranches,
        hasCommitAnalyzer,
        hasChangelogPlugin,
        hasGithubPlugin,
      },
      workflowCheck: {
        workflowPath: ".github/workflows/semantic-release.yml",
        masterTrigger: workflowHasMasterTrigger,
        runsSemanticRelease: workflowRunsSemanticRelease,
        buildsElectron: workflowBuildsElectron,
        uploadsLatestYml: workflowUploadsLatestYml,
        uploadsBlockmap: workflowUploadsBlockmap,
      },
      failures,
      warnings,
      preReleaseChecklist: [
        "Verify conventional commits on master",
        "Confirm semantic-release workflow green",
        "Confirm Windows assets uploaded (exe, latest.yml, blockmap)",
      ],
    },
  };
}

function hasCriticalSection(content: string, section: string): boolean {
  const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingPattern = new RegExp(`^#{1,6}\\s+${escapedSection}\\b`, "im");
  return headingPattern.test(content);
}

function runDocsDriftChecks(params: Record<string, unknown>): {
  status: "pass" | "degrade" | "fail";
  output: Record<string, unknown>;
} {
  const repositoryRoot = path.resolve(__dirname, "..");
  const checkPaths = toStringArray(params.checkPaths);
  const criticalSections = toStringArray(params.criticalSections);

  const issues: DocsDriftIssue[] = [];
  const scannedFiles: string[] = [];
  const fileContents: Record<string, string> = {};

  for (const relativePath of checkPaths) {
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = path.join(repositoryRoot, normalizedPath);

    if (!fs.existsSync(absolutePath)) {
      issues.push({
        severity: "major",
        type: "missing_file",
        file: normalizedPath,
        message: `Configured doc file not found: ${normalizedPath}`,
        fix: "Update agents/config.json checkPaths or create the missing file.",
      });
      continue;
    }

    scannedFiles.push(normalizedPath);
    fileContents[normalizedPath] = fs.readFileSync(absolutePath, "utf-8");
  }

  for (const section of criticalSections) {
    const existsInAnyFile = scannedFiles.some((filePath) =>
      hasCriticalSection(fileContents[filePath], section),
    );

    if (!existsInAnyFile) {
      issues.push({
        severity: "minor",
        type: "missing_critical_section",
        message: `Critical section not found in checked docs: ${section}`,
        fix: "Add or restore the missing section in one of the checked Markdown files.",
      });
    }
  }

  const stalePatterns: Array<{
    type: string;
    severity: "major" | "minor";
    pattern: RegExp;
    message: string;
    fix: string;
  }> = [
    {
      type: "stale_branch_reference",
      severity: "major",
      pattern: /\bpush\s+origin\s+main\b/i,
      message: "Found outdated branch command referencing 'main'.",
      fix: "Update command to the current default branch (master).",
    },
    {
      type: "stale_branch_reference",
      severity: "major",
      pattern: /branches:\s*\[\s*main(?:\s*,\s*develop)?\s*\]/i,
      message: "Found outdated workflow branch list including 'main/develop'.",
      fix: "Align branch filters with current workflow configuration.",
    },
    {
      type: "template_placeholder",
      severity: "major",
      pattern: /\{\{\s*(VERSION|LAST_UPDATED)\s*\}\}/i,
      message: "Found unresolved template placeholder in documentation.",
      fix: "Replace placeholders with real values.",
    },
  ];

  for (const filePath of scannedFiles) {
    const content = fileContents[filePath];

    for (const stalePattern of stalePatterns) {
      if (stalePattern.pattern.test(content)) {
        issues.push({
          severity: stalePattern.severity,
          type: stalePattern.type,
          file: filePath,
          message: stalePattern.message,
          fix: stalePattern.fix,
        });
      }
    }
  }

  const packageJsonPath = path.join(repositoryRoot, "package.json");
  let currentVersion = "unknown";

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJsonContent = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf-8"),
      ) as { version?: string };
      if (typeof packageJsonContent.version === "string") {
        currentVersion = packageJsonContent.version;
      }
    } catch {
      issues.push({
        severity: "minor",
        type: "version_read_error",
        message: "Unable to parse package.json to verify current version.",
        fix: "Check package.json syntax.",
      });
    }
  }

  const majorIssues = issues.filter((issue) => issue.severity === "major");
  const minorIssues = issues.filter((issue) => issue.severity === "minor");

  const status: "pass" | "degrade" | "fail" =
    majorIssues.length > 0
      ? "fail"
      : minorIssues.length > 0
        ? "degrade"
        : "pass";

  return {
    status,
    output: {
      description: "Documentation vs implementation alignment check",
      currentVersion,
      checkedFiles: scannedFiles,
      checkedCount: scannedFiles.length,
      issues,
      summary: {
        majorDrift: majorIssues.length,
        minorDrift: minorIssues.length,
      },
      recommendation:
        status === "pass"
          ? "Docs aligned with current checks."
          : "Review listed drift issues and update affected docs.",
    },
  };
}

async function runAgent(
  name: string,
  params: Record<string, unknown>,
): Promise<AgentResult> {
  const startTime = Date.now();

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`▶ Running Agent: ${name}`);
  console.log(`═══════════════════════════════════════════════════════════`);

  const agentConfig = config.agents[name as keyof typeof config.agents];

  if (!agentConfig) {
    console.error(`❌ Agent '${name}' not found in config`);
    return {
      agent: name,
      status: "fail",
      timestamp: new Date().toISOString(),
      duration: 0,
      output: { error: "Agent not found" },
    };
  }

  if (!agentConfig.enabled) {
    console.log(`⏭️  Agent '${name}' is disabled`);
    return {
      agent: name,
      status: "pass",
      timestamp: new Date().toISOString(),
      duration: 0,
      output: { skipped: true },
    };
  }

  console.log(`📋 Description: ${agentConfig.description}`);
  console.log(`⏱️  Timeout: ${agentConfig.timeout}ms`);
  console.log();

  // Merge default params with provided params
  const mergedParams = { ...agentConfig.defaultParams, ...params };
  console.log(`📦 Parameters:`, JSON.stringify(mergedParams, null, 2));

  if (name === "docs-drift") {
    const docsDriftResult = runDocsDriftChecks(mergedParams);
    return {
      agent: name,
      status: docsDriftResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: docsDriftResult.output,
    };
  }

  if (name === "data-integrity") {
    const dataIntegrityResult = runDataIntegrityChecks(mergedParams);
    return {
      agent: name,
      status: dataIntegrityResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: dataIntegrityResult.output,
    };
  }

  if (name === "parser-resilience") {
    const parserResilienceResult = runParserResilienceChecks(mergedParams);
    return {
      agent: name,
      status: parserResilienceResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: parserResilienceResult.output,
    };
  }

  if (name === "fitting-qa") {
    const fittingQaResult = runFittingQaChecks(mergedParams);
    return {
      agent: name,
      status: fittingQaResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: fittingQaResult.output,
    };
  }

  if (name === "results-consistency") {
    const resultsConsistencyResult = runResultsConsistencyChecks(mergedParams);
    return {
      agent: name,
      status: resultsConsistencyResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: resultsConsistencyResult.output,
    };
  }

  if (name === "electron-ipc") {
    const electronIpcResult = runElectronIpcChecks(mergedParams);
    return {
      agent: name,
      status: electronIpcResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: electronIpcResult.output,
    };
  }

  if (name === "release") {
    const releaseResult = runReleaseChecks(mergedParams);
    return {
      agent: name,
      status: releaseResult.status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      output: releaseResult.output,
    };
  }

  const duration = Date.now() - startTime;

  return {
    agent: name,
    status: "pass",
    timestamp: new Date().toISOString(),
    duration,
    output: {
      description: `Mock run for agent: ${name}`,
      params: mergedParams,
      note: "Implement actual agent logic here",
    },
  };
}

async function runWorkflow(workflowName: string): Promise<AgentResult[]> {
  const workflow =
    config.workflows[workflowName as keyof typeof config.workflows];

  if (!workflow) {
    console.error(`❌ Workflow '${workflowName}' not found in config`);
    return [];
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║ Workflow: ${workflowName.padEnd(52)} ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
  console.log(`📋 Agents: ${workflow.agents.join(", ")}`);
  console.log(`🛑 Fail Fast: ${workflow.failFast ? "enabled" : "disabled"}`);
  console.log(`📊 Minimum Score: ${workflow.minScore}%\n`);

  const results: AgentResult[] = [];

  for (const agentName of workflow.agents) {
    const result = await runAgent(agentName, {});

    results.push(result);

    if (workflow.failFast && result.status === "fail") {
      console.error(`\n⛔ Workflow halted due to agent failure: ${agentName}`);
      break;
    }
  }

  return results;
}

function printSummary(results: AgentResult[]): void {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║ Summary                                                  ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const degraded = results.filter((r) => r.status === "degrade").length;

  console.log(
    `✅ Passed: ${passed}/${results.length} | ⚠️  Degraded: ${degraded} | ❌ Failed: ${failed}`,
  );

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`⏱️  Total Time: ${totalDuration}ms\n`);

  if (config.reporting.storeInHistory) {
    const historyPath = config.reporting.historyPath as string;
    if (!fs.existsSync(historyPath)) {
      fs.mkdirSync(historyPath, { recursive: true });
    }

    const reportName = `report-${new Date().toISOString().replace(/[^0-9]/g, "")}.json`;
    const reportPath = path.join(historyPath, reportName);

    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          results,
          summary: {
            total: results.length,
            passed,
            failed,
            degraded,
            totalDuration,
          },
        },
        null,
        2,
      ),
    );

    console.log(`📁 Report saved: ${reportPath}`);
  }
}

async function main(): Promise<void> {
  try {
    if (workflowName) {
      const results = await runWorkflow(workflowName);
      printSummary(results);

      const hasCriticalFailure = results.some((r) => r.status === "fail");
      process.exit(hasCriticalFailure ? 1 : 0);
    } else if (agentName === "all") {
      const allAgentNames = Object.keys(config.agents);
      const results: AgentResult[] = [];

      for (const name of allAgentNames) {
        const result = await runAgent(name, {});
        results.push(result);
      }

      printSummary(results);

      const hasCriticalFailure = results.some((r) => r.status === "fail");
      process.exit(hasCriticalFailure ? 1 : 0);
    } else if (agentName) {
      // Parse additional params from CLI args
      const customParams: Record<string, unknown> = {};

      Object.entries(options).forEach(([key, value]) => {
        if (key !== "agent" && key !== "workflow") {
          customParams[key] = value;
        }
      });

      const result = await runAgent(agentName, customParams);
      printSummary([result]);

      process.exit(result.status === "fail" ? 1 : 0);
    } else {
      console.log(`\n📖 Agent Runner - R3E Toolbox QA Orchestration\n`);
      console.log(`Usage:`);
      console.log(`  npx ts-node agents/runner.ts --agent <name> [params]`);
      console.log(`  npx ts-node agents/runner.ts --workflow <name>`);
      console.log(`  npx ts-node agents/runner.ts --agent all\n`);
      console.log(`Available Agents:`);

      Object.entries(config.agents).forEach(([name, cfg]) => {
        console.log(
          `  • ${name.padEnd(20)} - ${cfg.description} (${cfg.enabled ? "enabled" : "disabled"})`,
        );
      });

      console.log(`\nAvailable Workflows:`);
      Object.entries(config.workflows).forEach(([name, cfg]) => {
        console.log(`  • ${name.padEnd(20)} - ${cfg.agents.length} agents`);
      });

      console.log(`\nExamples:`);
      console.log(
        `  npx ts-node agents/runner.ts --agent data-integrity --filePaths="aiadaptation.xml"`,
      );
      console.log(`  npx ts-node agents/runner.ts --workflow pr`);
      console.log(
        `  npx ts-node agents/runner.ts --workflow pre-release --releaseVersion="1.4.0"\n`,
      );
    }
  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  }
}

main();
