# QA Agents - Next Steps for Team

Azioni concrete per attivare gli agenti nel progetto.

---

## ✅ Completed (已完成)

**Infrastructure setup:**

- ✓ `agents/config.json` — Configuration master
- ✓ `agents/runner.ts` — TypeScript orchestrator
- ✓ `.github/workflows/agent-qa-suite.yml` — CI/CD pipeline
- ✓ `agents/README.md` — Quick start guide

**Documentation:**

- ✓ `AGENTS.md` — Detailed specs & prompts
- ✓ `AGENT_IMPLEMENTATION_GUIDE.md` — Practical usage
- ✓ `AGENT_SETUP_MAINTENANCE.md` — Maintenance checklist
- ✓ `QA_AGENTS_QUICK_REFERENCE.md` — Quick summary
- ✓ `QA_AGENTS_ARCHITECTURE.md` — System design
- ✓ `../NPM_SCRIPTS.md` — npm shortcuts
- ✓ `AGENT_NEXT_STEPS.md` — This file

---

## 🔧 Phase 1: Immediate Setup (1-2 hours)

### Step 1: Verify Local Setup

```bash
cd d:\SimRacing\RaceRoom\r3e-toolbox

# Test runner
npx ts-node agents/runner.ts

# Should output:
# 📖 Agent Runner - R3E Toolbox QA Orchestration
# Available Agents:
#   • data-integrity ...
#   • parser-resilience ...
#   [etc]
```

✓ If works, proceed.
✗ If error, check Node.js version >= 24:

```bash
node --version  # Should be v24.x
npm --version
npm ci  # Reinstall deps
```

### Step 2: Add npm Scripts (Optional but Recommended)

Edit `package.json` and add under `"scripts"`:

```json
{
  "scripts": {
    "agent:help": "ts-node agents/runner.ts",
    "agent:all": "ts-node agents/runner.ts --agent all",
    "agent:data-integrity": "ts-node agents/runner.ts --agent data-integrity",
    "agent:parser-resilience": "ts-node agents/runner.ts --agent parser-resilience",
    "agent:fitting-qa": "ts-node agents/runner.ts --agent fitting-qa",
    "agent:results-consistency": "ts-node agents/runner.ts --agent results-consistency",
    "agent:electron-ipc": "ts-node agents/runner.ts --agent electron-ipc",
    "agent:ui-regression": "ts-node agents/runner.ts --agent ui-regression",
    "agent:release": "ts-node agents/runner.ts --agent release",
    "agent:docs-drift": "ts-node agents/runner.ts --agent docs-drift",
    "agent:workflow:pr": "ts-node agents/runner.ts --workflow pr",
    "agent:workflow:nightly": "ts-node agents/runner.ts --workflow nightly",
    "agent:workflow:weekly": "ts-node agents/runner.ts --workflow weekly",
    "agent:workflow:pre-release": "ts-node agents/runner.ts --workflow pre-release",
    "agent:workflow:full": "ts-node agents/runner.ts --workflow full-suite"
  }
}
```

Then test:

```bash
npm run agent:help
npm run agent:workflow:pr  # This should start running agents
```

### Step 3: Test PR Workflow Locally

```bash
# From repo root
npm run agent:workflow:pr

# Expected output:
# ═══════════════════════════════════════════════════════════
# ▶ Running Agent: data-integrity
# ═══════════════════════════════════════════════════════════
# 📋 Description: Schema validation, unit consistency, anomaly detection
# [... more output ...]
#
# ✅ Passed: 3/3 | ⚠️ Degraded: 0 | ❌ Failed: 0
# ⏱️ Total Time: XXXxxms
# 📁 Report saved: .agent-reports/report-20260228...json
```

✓ If works, agents are operative locally!

### Step 4: Commit to Git

```bash
git add agents/
git add agents/docs/
git add .github/workflows/agent-qa-suite.yml

git commit -m "feat: Add specialized QA agents (Data Integrity, Parser Resilience, Fitting QA, Results Consistency, Electron IPC, UI Regression, Release, Docs Drift)"

git push origin master
```

---

## 🚀 Phase 2: GitHub Actions Integration (30 min)

### Step 1: Verify Workflow File

GitHub should auto-detect `.github/workflows/agent-qa-suite.yml`:

1. Go to repo → **Actions** tab
2. Should see "Agent QA Suite" workflow listed
3. Click it → "Run workflow" button visible

### Step 2: Test Manual Trigger

```
GitHub → Actions → Agent QA Suite → Run workflow
  ├─ Select suite: "pr"
  └─ Click "Run workflow"
```

Monitor the run in GitHub Actions logs. Should complete <5 min.

✓ If pass, CI is working!

### Step 3: Test on Actual PR

Create feature branch + PR:

```bash
git checkout -b test/qa-agents-integration
echo "# Test PR for QA agents" >> README.md
git add README.md
git commit -m "test: trigger QA agents on PR"
git push origin test/qa-agents-integration
```

Go to GitHub → Create PR → Observe:

- [ ] PR checks running (data-integrity, parser-resilience, ui-regression)
- [ ] Check results green ✓ or red 🛑
- [ ] Click "Details" → see agent output in logs

Once green, merge PR to `master` or close it.

---

## 📅 Phase 3: Schedule Configuration (15 min)

### Confirm Nightly Schedule

Edit `.github/workflows/agent-qa-suite.yml`:

```yaml
on:
  schedule:
    - cron: "0 2 * * 1,4" # Monday & Thursday 2 AM UTC
```

Change if needed:

- **Monday only**: `"0 2 * * MON"`
- **Daily**: `"0 2 * * *"`
- **Your timezone**: Convert 2 AM UTC to your time (e.g., 3 AM GMT = `"0 3 * * *"`)

Then:

```bash
git add .github/workflows/agent-qa-suite.yml
git commit -m "config: adjust nightly schedule to team timezone"
git push origin master
```

---

## 👥 Phase 4: Team Onboarding (1-2 hours)

### 1. Share Documentation

Send links to team:

- **Quick start**: `QA_AGENTS_QUICK_REFERENCE.md`
- **Implementation**: `AGENT_IMPLEMENTATION_GUIDE.md`
- **Architecture**: `QA_AGENTS_ARCHITECTURE.md`

### 2. Live Demo (30 min)

Show team:

```bash
# What agents look like
npm run agent:help

# Run PR workflow
npm run agent:workflow:pr

# Show reports
ls -la .agent-reports/

# Interpret success
echo "✓ All agents passed - PR can merge"
```

### 3. Q&A Session

Walk through:

- How agents integrate into PR flow
- What happens if agent fails (show fix flow)
- Where to find reports
- Who to contact if issue

### 4. Assign Responsibilities

| Role       | Responsibility                      |
| ---------- | ----------------------------------- |
| QA Lead    | Monitor nightly runs, triage issues |
| DevOps     | Maintain CI/CD, workflows           |
| Senior Dev | Review parser/fitting logic issues  |
| All Devs   | Use agents in PR workflow           |

---

## 🔍 Phase 5: Monitor & Tune (Ongoing)

### First Week

Each day, check:

```bash
# Check latest report
jq '.summary' .agent-reports/report-*.json | tail -5

# Look for patterns
grep -h '"fail"' .agent-reports/*.json | wc -l
```

Expected:

- PR agents: mostly pass (false positives minimal)
- Nightly: baseline metrics stable

### First Month

Weekly meeting (Friday):

```
QA Health Check
─────────────────
Data Integrity: 100% pass
Parser Resilience: 0 regressions
Fitting QA: avg R² = 0.92
Results Consistency: 87% quality
Electron IPC: secure, <2s latency
UI Regression: <60s load time
Release: n/a (no releases yet)
Docs Drift: 0 major issues
```

Adjust thresholds if needed:

```bash
# Example: Fitting QA too many warnings?
edit agents/config.json
# Reduce testMaxTimePct: 0.10 → 0.08
npm run agent:fitting-qa
```

---

## 📞 Support & Escalation

### Common Issues

| Issue                  | Solution                                   |
| ---------------------- | ------------------------------------------ |
| Agent timeout in CI    | Increase `timeout` in `agents/config.json` |
| False positive failure | Mark as known issue, adjust severity       |
| Need custom parameter  | Edit `config.json`, push, re-run           |
| Agent logic bug        | Create issue, assign to owner              |

### Escalation

If agent blocking releases:

1. Check `.agent-reports/` for root cause
2. Post in team chat with link
3. Assign to QA lead / relevant owner
4. Decide: fix code or adjust threshold
5. Re-run to verify

---

## ✨ Success Criteria

Project "has good QA agents" when:

- ✓ All developers understand `npm run agent:workflow:pr`
- ✓ No PR merges without agent checks passing
- ✓ Nightly reports reviewed weekly
- ✓ Trend reports show stable metrics
- ✓ <1 false positive per month (agents trustworthy)
- ✓ <1 critical issue escaped without agent catching it

---

## 🎯 Next 30 Days Roadmap

| Week     | Milestone                             |
| -------- | ------------------------------------- |
| Now      | Phase 1-2: Setup + CI integration ✓   |
| +1 week  | Phase 3-4: Schedule + Team onboarding |
| +2 weeks | Phase 5: Monitoring + tuning          |
| +4 weeks | Agents mature, threshold stability    |

---

## 📋 Checklist for Release Manager

Before publishing release:

- [ ] Run `npm run agent:workflow:pre-release --releaseVersion="x.y.z"`
- [ ] All 8 agents report status: `ready` or `pass`
  - [ ] Data Integrity: ✓
  - [ ] Parser Resilience: ✓
  - [ ] Fitting QA: ✓
  - [ ] Results Consistency: ✓
  - [ ] Electron IPC: ✓
  - [ ] UI Regression: ✓
  - [ ] Release: ✓ (ready to publish)
  - [ ] Docs Drift: ✓
- [ ] Review `.agent-reports/report-*.json` for anomalies
- [ ] GitHub Actions workflow reports success
- [ ] Proceed to publish

---

## 🚀 Deployment Steps

Once Phase 1-2 complete and passing:

```bash
# 1. Master branch ready?
git status  # Should be clean

# 2. All agents installed?
npm run agent:help  # Should work

# 3. Workflow active?
# Check GitHub → Actions → Agent QA Suite (should exist)

# 4. Announce to team
# Post in Slack/chat: "QA agents active, PR agents now in use"

# 5. Monitor first week
# Watch for any unexpected failures
# Adjust agents/config.json as needed

# 6. Lock it in
# Once stable, mark as "Production QA System"
```

---

## 📞 Questions?

Refer to:

- **"How do I use agents?"** → `QA_AGENTS_QUICK_REFERENCE.md`
- **"Agent failed, what now?"** → `AGENT_IMPLEMENTATION_GUIDE.md`
- **"How do agents work?"** → `QA_AGENTS_ARCHITECTURE.md`
- **"How do I maintain them?"** → `AGENT_SETUP_MAINTENANCE.md`
- **"Agent specs?"** → `AGENTS.md`

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-28  
**Status**: Ready for Integration
