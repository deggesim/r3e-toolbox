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
    const key = args[i].substring(2);
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

  // Here we would call the actual agent logic
  // For now, return a mock result that shows the structure

  const duration = Date.now() - startTime;

  const mockResult: AgentResult = {
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

  return mockResult;
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
