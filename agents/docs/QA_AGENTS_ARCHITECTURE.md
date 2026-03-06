# R3E Toolbox - QA Agents Architecture Overview

Visualizzazione della struttura di orchestrazione degli agenti.

---

## 🏗️ Agent Orchestration Flow

```mermaid
graph TB
    subgraph "Manual Triggers"
        DEV["Developer<br/>npm run agent:*"]
        REL["Release Lead<br/>pre-release workflow"]
        SUP["Support<br/>diagnostic run"]
    end

    subgraph "CI/CD Events"
        PR["Pull Request"]
        PUSH["Push to master"]
        SCHED["GitHub Scheduler<br/>Mon/Thu 2 AM UTC"]
        MAN["Manual Workflow Dispatch"]
    end

    subgraph "Agent Runner (agents/runner.ts)"
        RUNNER["Agent Orchestrator"]
        CFG["Load config.json"]
        LOG["Initialize Logger"]
    end

    subgraph "8 Specialized Agents"
        A1["Data Integrity<br/>30s timeout"]
        A2["Parser Resilience<br/>60s timeout"]
        A3["Fitting QA<br/>120s timeout"]
        A4["Results Consistency<br/>60s timeout"]
        A5["Electron IPC<br/>45s timeout"]
        A6["UI Regression<br/>120s timeout"]
        A7["Release<br/>180s timeout"]
        A8["Docs Drift<br/>45s timeout"]
    end

    subgraph "5 Workflows"
        W1["PR Workflow<br/>A1+A2+A6<br/>fail-fast"]
        W2["Nightly<br/>A3+A4<br/>no fail-fast"]
        W3["Weekly<br/>A5+A8<br/>no fail-fast"]
        W4["Pre-Release<br/>All 8<br/>fail-fast"]
        W5["Full Suite<br/>All 8<br/>no fail-fast"]
    end

    subgraph "Output"
        REPORT[".agent-reports/<br/>report-*.json"]
        GH["GitHub Issues<br/>Auto-created"]
        SLACK["Slack Notification<br/>Optional"]
    end

    subgraph "Storage"
        STORE["electron-store<br/>Persistent"]
        LOGS["Process Logs<br/>In-memory"]
    end

    %% Connections
    DEV --> RUNNER
    REL --> RUNNER
    SUP --> RUNNER
    PR --> W1
    PUSH --> W1
    SCHED --> W2
    SCHED --> W3
    MAN --> W4 | W5

    RUNNER --> CFG
    RUNNER --> LOG
    CFG --> W1 | W2 | W3 | W4 | W5

    W1 --> A1 & A2 & A6
    W2 --> A3 & A4
    W3 --> A5 & A8
    W4 --> A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8
    W5 --> A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8

    A1 --> REPORT
    A2 --> REPORT
    A3 --> REPORT
    A4 --> REPORT
    A5 --> REPORT
    A6 --> REPORT
    A7 --> REPORT
    A8 --> REPORT

    REPORT --> GH
    REPORT --> SLACK
    REPORT --> STORE

    style A1 fill:#e1f5ff
    style A2 fill:#e1f5ff
    style A3 fill:#fff3e0
    style A4 fill:#fff3e0
    style A5 fill:#f3e5f5
    style A6 fill:#e1f5ff
    style A7 fill:#ffebee
    style A8 fill:#f3e5f5
    style W1 fill:#c8e6c9
    style W2 fill:#fff9c4
    style W3 fill:#ffe0b2
    style W4 fill:#ffccbc
    style W5 fill:#ffccbc
```

---

## 📊 Agent Responsibilities Matrix

| Agent                   | Input                        | Process                         | Output                     | On Fail       |
| ----------------------- | ---------------------------- | ------------------------------- | -------------------------- | ------------- |
| **Data Integrity**      | XML/JSON/TXT files           | Schema validation, unit checks  | violations report          | Block import  |
| **Parser Resilience**   | Parser modules + fixtures    | Regression test, edge cases     | pass/fail/degrade          | Block merge   |
| **Fitting QA**          | aiadaptation.xml + dataset   | Linear regression quality       | R², monotonicity score     | Warn/block    |
| **Results Consistency** | Results folder               | Session matching, data quality  | orphans, patches           | Warn user     |
| **Electron IPC**        | main.mjs, preload.cjs        | IPC audit, storage quota        | security score             | Block release |
| **UI Regression**       | Running app (localhost:5173) | Smoke test, responsive, console | visual + functional report | Block merge   |
| **Release**             | package.json, CHANGELOG      | Version check, build validate   | readiness checklist        | Block publish |
| **Docs Drift**          | Docs files + src code        | Sync comparison                 | drift score, stale items   | Create issue  |

---

## 🔄 Execution Sequences

### Scenario 1: Developer Creates PR

```
PR Created
  ↓
GitHub Actions triggered "pull_request" event
  ↓
Workflow: agent-qa-suite.yml → pr-data-integrity job
  ├─ data-integrity: validates XML in repo
  ├─ (if pass) parser-resilience: tests on fixtures
  ├─ (if pass) ui-regression: smoke test build
  ↓
All pass? → ✓ PR ready to merge (green check)
Any fail? → 🛑 Blocks merge (red X)
  ↓
Report saved → .agent-reports/report-*.json
GitHub check status updated automatically
```

### Scenario 2: Nightly Schedule (Monday 2 AM UTC)

```
Cron triggered: "0 2 * * MON"
  ↓
Workflow: agent-qa-suite.yml → nightly-* jobs
  ├─ fitting-qa
  └─ results-consistency
  ↓
Both complete (whether pass or fail, no blocking)
  ↓
Report saved → .agent-reports/report-*.json
GitHub issues auto-created if fail
Slack notification if configured
```

### Scenario 3: Release Lead Pre-Release

```
Release Lead clicks: GitHub Actions → agent-qa-suite → Run workflow
  ↓
Selects: suite = "pre-release", releaseVersion = "1.4.0"
  ↓
Workflow: agent-qa-suite.yml → pre-release-suite job
  ├─ All 8 agents run in parallel (with dependencies)
  ├─ fail-fast: YES (first failure stops)
  ↓
All pass? → ✓ "Ready to publish" checklist
Any fail? → 🛑 Detailed report + fix recommendations
  ↓
If blocked: Fix → re-run → iterate
If ready: Press "Publish" button → build & deploy
```

---

## 🎯 Agent Timing & Parallelism

**PR Workflow** (Parallel, <5 min total):

```
0s   ├─ data-integrity (30s) ──┐
     ├─ parser-resilience (60s)├─ All 3 in parallel
     └─ ui-regression (120s) ──┘
120s → Complete
```

**Nightly** (Parallel, <3 min total):

```
0s   ├─ fitting-qa (120s) ──┐
     └─ results-consistency (60s)
120s → Complete
```

**Pre-Release** (Sequential fail-fast, <10 min total):

```
0s    ├─ data-integrity (30s) ✓
30s   ├─ parser-resilience (60s) ✓
90s   ├─ fitting-qa (120s) ✓
210s  └─ [remaining 5 agents...]
```

---

## 📈 Key Metrics Tracked

Per agente, ogni run produce:

```json
{
  "agent": "fitting-qa",
  "status": "pass|degraded|fail",
  "duration": 5234, // ms
  "timestamp": "2026-02-28T14:30:00Z",
  "output": {
    "overallScore": 94,
    "violations": [
      {
        "severity": "warning",
        "category": "monotonicity",
        "track": "Silverstone",
        "class": "GT3"
      }
    ]
  }
}
```

Team tracks over time:

- Pass rate %
- Avg duration (performance)
- Violation trends
- False positive rate

---

## 🛡️ Safety Mechanisms

### Fail-Fast (PR & Pre-Release)

If one agent critical-fail, stop immediately.
→ Prevents bad code from advancing

### No Fail-Fast (Nightly & Weekly)

All agents run independently.
→ Collects maximum diagnostics for analysis

### Severity Thresholds

Each agent has `blockingThreshold`:

- `critical` → blocks merge/release
- `warning` → logs, notifies, doesn't block
- `info` → silent

### Timeout Protection (Per Agent)

- No agent hangs forever
- Max 180s (release agent)
- Excess time auto-reported as slow in output

---

## 🔌 Integration Points

### GitHub Actions

- `.github/workflows/agent-qa-suite.yml` orchestrates
- PR checks: block on critical fail
- Workflow dispatch: manual triggers
- Issue creation: on fail-fast blockers

### Agent Runner

- `agents/runner.ts` parses config & dispatches
- Loads `agents/config.json` for params
- Outputs to `.agent-reports/` JSON
- Can be invoked locally or in CI

### Storage

- `electron-store` for persistent metrics (future)
- Logs in-memory during run
- Exports JSON for history

---

## 🚀 Future Enhancements

Roadmap opzionale:

1. **Agent Plugins**: Allow custom agents (not just 8 built-in)
2. **Web Dashboard**: Visualize agent results over time
3. **Slack Integration**: Real-time notifications on fail
4. **Auto-Remediation**: Some agents propose + apply fixes
5. **Cost Tracking**: Monitor CI resource usage per agent
6. **Parallel Optimization**: Schedule agents based on duration to minimize wall-clock time

---

**Version**: 1.0  
**Last Updated**: 2026-02-28  
**Diagram Language**: Mermaid (view in GitHub or local markdown renderer)
