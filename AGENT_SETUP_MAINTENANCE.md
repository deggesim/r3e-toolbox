# R3E Toolbox - QA Agent Setup & Maintenance Checklist

---

## 🚀 Initial Setup (Once)

### Phase 1: Infrastructure

- [ ] Cartella `agents/` creata nel repo root
- [ ] File `agents/config.json` committato
- [ ] File `agents/runner.ts` committato (TypeScript ORM)
- [ ] File `.github/workflows/agent-qa-suite.yml` committato
- [ ] Directory `.agent-reports/` creata (gitignored)

### Phase 2: Configuration Review

- [ ] Review `agents/config.json`:
  - Tutti gli agenti `enabled: true`?
  - Schedule cron correct per timezone team? (default: UTC 2 AM)
  - Severità thresholds appropriate?
- [ ] Review GitHub Actions workflow:
  - Node.js version match team standard? (24.x)
  - Timeout values reasonable per data size?
  - Artifact retention (default: 30 days) OK?

### Phase 3: Team Onboarding

- [ ] Share `AGENT_IMPLEMENTATION_GUIDE.md` con team
- [ ] Run `npx ts-node agents/runner.ts --workflow pr` in CI (test run)
- [ ] Document in project wiki or README:
  - Come lanciare agenti locally
  - Come interpretare failures
  - Who's "on-call" se agent fallisce in CI

### Phase 4: Local Development Setup

```bash
# Ogni dev nel team:
npm ci  # Install exact versions
npm run agent:help  # Verify setup
npx ts-node agents/runner.ts --workflow pr  # Test local
```

---

## 🔄 Weekly Maintenance

Every **Monday morning** (after nightly run):

- [ ] Check `.agent-reports/` per latest nightly results
- [ ] Review any `warned` or `failed` agents:
  ```bash
  jq '.summary | select(.failed > 0 or .degraded > 0)' \
    .agent-reports/report-*.json
  ```
- [ ] If issues, create GitHub issues (or they auto-created)
- [ ] Update `agents/config.json` if thresholds need adjustment

---

## 🛠️ Maintenance Tasks

### Adding New Test Fixture

When adding new test data (e.g., aiadaptation-500samples.xml):

```bash
# 1. Place file in test-fixtures/
cp /path/to/sample.xml test-fixtures/aiadaptation-500samples.xml

# 2. Run parser resilience to baseline
npm run agent:parser-resilience

# 3. Agent automatically includes new fixture in regression suite
# Next CI run will validate it
```

### Adjusting Severity Thresholds

Example: Fitting QA R² threshold too strict (>0.90 → >0.85)?

1. Edit `agents/config.json`:

   ```json
   "fitting-qa": {
     "defaultParams": {
       "fittingParams": {
         "testMinAIdiffs": 5,
         "testMaxTimePct": 0.08,  // ← tighten to 8%
         "testMaxFailsPct": 0.03   // ← tighten to 3%
       }
     }
   }
   ```

2. Validate change:

   ```bash
   npm run agent:fitting-qa
   ```

3. Commit & push—next CI uses new thresholds

### Updating Agent Timeout

If UI regression timeout (default 120s) not enough:

```json
"ui-regression": {
  "timeout": 180000  // ← increase to 180s
}
```

Then:

```bash
npm run agent:ui-regression
```

---

## 📊 Monthly Review

**Last Friday of month:**

- [ ] Generate QA metrics summary:

  ```bash
  ls .agent-reports/ | wc -l  # How many reports this month?
  grep -h '"status"' .agent-reports/*.json | sort | uniq -c
  ```

- [ ] Identify trends:
  - Parser regression: ↑ or ↓?
  - UI regression timing: improving?
  - Docs drift items: accumulating?

- [ ] Update team scorecard (wiki or Slack):

  ```
  QA Health (March 2026)
  ✓ Data Integrity: 100% pass rate (31/31 tests)
  ✓ Parser Resilience: 0 regressions
  ⚠ Fitting QA: 1 warning (track XYZ monotonicity)
  ✓ Results Consistency: all green
  ```

- [ ] Discuss with team:
  - Any patterns in failures?
  - Should we add/remove agents?
  - Thresholds still appropriate?

---

## 🐛 Incident Response

### Agent Fails in CI

Example: PR merged, parser-resilience said "pass", but test suite failed next day?

**Root cause = agent undiscovered edge case**

1. Check `.agent-reports/` latest report
2. Identify which fixture failed
3. Create issue: `[QA] Parser regression: <fixture name>`
4. Assign to author of recent parser change
5. Fix → re-run agent locally → validate → commit

### Agent Timeout

Example: `ui-regression: timeout after 120s`

1. Check if legitimate (large data):

   ```bash
   npm run agent:ui-regression  # Re-run locally
   # If passes locally in <60s, might be CI machine slow
   ```

2. If legit slow:

   ```bash
   # Increase timeout in config
   "ui-regression": { "timeout": 180000 }
   # Commit & re-run
   ```

3. If random timeout (timing issue):
   - Might be race condition in test
   - Re-run once more
   - If persists, investigate test logic

### False Positive

Example: Fitting QA says "monotonicity violation" but data looks OK?

1. Check agent output detail:

   ```bash
   jq '.output.monotonicity' .agent-reports/report-*.json | head -50
   ```

2. Manually inspect data:

   ```bash
   # aiadaptation.xml for Silverstone GT3
   grep -A 20 'Silverstone.*GT3' aiadaptation.xml
   ```

3. If agent's violation is wrong, file issue:
   `[QA] Fitting QA false positive: Silverstone GT3`
   - Assign to Fitting QA owner
   - Include sample data that triggers bug

---

## 🚀 Pre-Release Checklist

**1 week before release:**

```bash
# 1. Run full pre-release suite
npm run agent:workflow:pre-release --releaseVersion="1.4.0"

# Expected output: All agents "pass" or "ready"
```

**2. Blocks to fix before release:**

- [ ] Data Integrity: 0 critical violations
- [ ] Parser Resilience: 0 regressions
- [ ] Fitting QA: R² > 0.85, monotonicity violations < 1%
- [ ] Results Consistency: data quality > 85%
- [ ] Electron IPC: "secure" status, no timeouts
- [ ] UI Regression: 0 console errors, <60s load time
- [ ] Release Agent: build OK, versioning aligned, updater logic works
- [ ] Docs Drift: <2 stale sections

**3. Publish checklist:**

- [ ] All agents passed
- [ ] CHANGELOG.md updated
- [ ] Version bumped (package.json)
- [ ] Git tag created
- [ ] GitHub draft release ready
- [ ] Run once more locally for sanity
- [ ] Publish → GitHub Actions auto-deploys

---

## 📖 Team Documentation

Keep these docs updated:

- [ ] `AGENTS.md` — Agent specs & prompts (reference)
- [ ] `AGENT_IMPLEMENTATION_GUIDE.md` — Practical usage (for devs)
- [ ] `agents/NPM_SCRIPTS.md` — npm run shortcuts (copy to wiki)
- [ ] `README.md` — Link to "QA" section in setup

**Update trigger**: Whenever agent config changes or new agent added

---

## 🔐 Access & Permissions

Ensure team has:

- [ ] **Read access**: `.agent-reports/` directory
- [ ] **Write access**: `agents/config.json` (for threshold tweaks)
- [ ] **GitHub Workflows tab access**: To view CI runs
- [ ] **Issue creation privilege**: To triage agent failures

---

## 🆘 Runbook: If Agent System Breaks

### All agents suddenly failing

1. Check GitHub Actions > Workflows > Log
2. Likely cause: Node.js version incompatible, or `agents/runner.ts` syntax error
3. Fix:
   ```bash
   npm ci  # Reinstall exact deps
   npx ts-node agents/runner.ts  # Test runner
   ```
4. If still broken, revert recent commit to `agents/` folder

### Runner times out consistently

1. Check CI machine resource (GitHub Actions dashboard)
2. If resource constrained, increase runner timeout in workflow YAML
3. Or reduce test fixture size temporarily

### Reports folder growing too large

```bash
# Clean old reports >30 days
find .agent-reports/ -type f -mtime +30 -delete
```

(Remember: GitHub Actions artifacts auto-deleted after 30 days per config)

---

## 📞 Support Contacts

| Role       | Responsible | Slack                          |
| ---------- | ----------- | ------------------------------ |
| QA Lead    | @qa-lead    | Triage, thresholds, decisions  |
| DevOps     | @devops     | CI/CD workflow, infrastructure |
| Senior Dev | @senior-dev | Parser/fitting logic review    |

---

## ✅ Sign-Off

**Setup completed by**: ******\_\_\_\_******  
**Date**: ******\_\_\_\_******  
**Team reviewed**: ******\_\_\_\_******

---

**Last Updated**: 2026-02-28  
**Next review**: 2026-04-30  
**Version**: 1.0 (Operational)
