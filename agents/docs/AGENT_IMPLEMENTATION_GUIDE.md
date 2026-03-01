# Agent Implementation Guide

Guida pratica per integrare e usare gli agenti QA specializzati nel progetto R3E Toolbox.

---

## 📋 Quick Start

### 1. Setup Iniziale

Gli agenti sono già configurati. Per iniziare subito:

```bash
# Installa dipendenze (già fatto)
npm ci

# Esegui singolo agente
npx ts-node agents/runner.ts --agent data-integrity --filePaths="aiadaptation.xml"

# Esegui workflow completo
npx ts-node agents/runner.ts --workflow pr
```

### 2. Verifica Configurazione

```bash
# Mostra list agenti e workflows disponibili
npx ts-node agents/runner.ts

# Output:
# 📖 Agent Runner - R3E Toolbox QA Orchestration
#
# Usage:
#   npx ts-node agents/runner.ts --agent <name> [params]
#   npx ts-node agents/runner.ts --workflow <name>
#   npx ts-node agents/runner.ts --agent all
#
# Available Agents:
#   • data-integrity       - Schema validation, unit consistency...
#   • parser-resilience    - Regression testing, edge case...
#   • fitting-qa           - Monotonicity, regression quality...
#   ...
```

---

## 🎯 Scenari di Utilizzo

### Scenario A: Reviewo PR con cambio parsers (pre-merge)

```bash
# Esegui automaticamente via CI (già wired in GitHub Actions)
# O manualmente:
npx ts-node agents/runner.ts --workflow pr

# Expected:
# ✓ data-integrity pass
# ✓ parser-resilience pass (nessuna regressione)
# ✓ ui-regression pass (no console errors)
```

**Se parser-resilience fallisce:**

1. Controlla output nel `.agent-reports/`
2. Vedi quale fixture è fallita
3. Fix il parser e ri-run, o rollback change

---

### Scenario B: Rilascio release (pre-publish)

Qualche giorno prima del release vero:

```bash
# Esegui full pre-release QA
npx ts-node agents/runner.ts --workflow pre-release \
  --releaseVersion="1.4.0"

# Output mostra:
# ✓ Versionamento allineato (package.json = CHANGELOG = tag)
# ✓ Build Electron OK, installer creato
# ✓ AutoUpdate logic validato
# ✓ Fitting quality non degradato
# ✓ Docs sincronizzate vs implementazione
```

**Se release agent blocca:**

1. Leggi output → guida ai fix (versione mismatch, updater config, etc)
2. Fix e re-run
3. Un volta che dice "ready", procedi a publish

---

### Scenario C: Diagnostica settimanale (nightly)

Martedì/venerdì mattina ricevi report automomatico:

```
GitHub Actions → Friday 2 AM UTC
├─ fitting-qa: passa su 487 track/class combos
├─ results-consistency: audit cartella Results attiva
└─ electron-ipc + docs-drift: weekly checks
```

Se qualcosa fallisce, issue automatico creato → team notificato.

---

### Scenario D: User lamenta ingestion file corrotto (pre-import)

Supporto tecnico prima di far importare file problematico:

```bash
# Valida file
npx ts-node agents/runner.ts --agent data-integrity \
  --filePaths="user-uploaded-aiadaptation.xml" \
  --strictMode=true

# Output:
# aiadaptation.xml: CRITICAL violations
#   - Line 42: Missing Player element in Session
#   - Line 98: Skill value 150 (out of 0-100 range)
#
# Recommendation: Ask user to provide valid file
```

---

## 📊 Interpretare Report

Dopo ogni run, report salvato in `.agent-reports/report-*.json`:

```json
{
  "timestamp": "2026-02-28T14:30:00Z",
  "results": [
    {
      "agent": "parser-resilience",
      "status": "degrade",
      "duration": 5234,
      "output": {
        "regression": {
          "detected": true,
          "failedTests": ["test-fixtures/mixed-array-xml.xml"]
        },
        "recommendation": "Review toArray() logic for single vs multiple elements"
      }
    }
  ],
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 0,
    "degraded": 1,
    "totalDuration": 12547
  }
}
```

**Interpretazione:**

- `status: "pass"` → ✓ procedi
- `status: "degrade"` → ⚠️ valida manual, monitora
- `status: "fail"` → 🛑 blocca, fix obbligatorio

---

## 🔧 Customizzare Agenti per il Tuo Flusso

### Es. 1: Aggiunta dato storico para Fitting QA

Hai dataset 2024 races? Usalo for regression validation:

**File:** `.agent-reports/historical-2024.json`

```bash
npx ts-node agents/runner.ts --agent fitting-qa \
  --historicalDataset="path/to/2024_production.json" \
  --strictMode=true
```

Agent ora confronta predictions fitting vs realtà 2024. Se accuratezza cala, allarma.

---

### Es. 2: Results Consistency con cartella gigante

Se cartella Results ha 500+ file:

```bash
npx ts-node agents/runner.ts --agent results-consistency \
  --resultsPath="UserData/Log/Results/" \
  --sessionPattern="2025-02-*" \
  --strict=true
```

Agente filtra solo sessioni February 2025, piu veloce.

---

### Es. 3: UI Regression con custom viewport

Test app su mobile + wide desktop:

```bash
npx ts-node agents/runner.ts --agent ui-regression \
  --baseUrl="http://localhost:5173" \
  --responsiveSizes="[320, 1920]"
```

---

## 🚨 Handling Failures

### Parser Resilience fallisce su nuova fixture

```
❌ test-fixtures/aiadaptation-500samples.xml: FAILED
   Error: Single vs Array mixing not detected
   Recommendation: Review src/utils/xmlParser.ts line 45 toArray() logic
```

**Fix flow:**

```bash
# 1. Review problematico
cat test-fixtures/aiadaptation-500samples.xml | head -50

# 2. Check parser logic
grep -n "toArray" src/utils/xmlParser.ts

# 3. Fix
# ... edit xmlParser.ts ...

# 4. Re-run per validare
npx ts-node agents/runner.ts --agent parser-resilience
```

---

### Fitting QA monotonicity violation

```
⚠️  Track: Silverstone, Class: GT3
    Skill 60→70: Time 1:45.2 → 1:45.3 (monotonicity break)
    Issue: Lap time increases with skill (anomalia)
```

**Diagnosis:**

- RaceRoom ha generato synthetic sample cattivo per skill 70?
- Config threshold `testMaxFailsPct` troppo lassista?
- Dato historico corrupted per questa combo?

**Fix:**

```bash
# 1. Controlla dato raw
npx ts-node agents/runner.ts --agent fitting-qa \
  --strictMode=true  # più constraints

# 2. Se problema persiste, segnala issue
```

---

### UI Regression timeout

```
⏱️  Timeout after 120s
    Step: Load Build Results page
    Issue: Large championship DB slowing render
```

**Debug:**

1. `npm run dev:vite` → da UI, open DevTools → Performance tab
2. Check se rendering è bottleneck
3. Optimize components or data loading
4. Increase timeout se legit large data: `--timeout="180000"`

---

## 🔄 CI/CD Integration Checklist

- [ ] Workflow `.github/workflows/agent-qa-suite.yml` committed
- [ ] Runner `agents/runner.ts` executable
- [ ] Config `agents/config.json` matches your team's QA cadence
- [ ] Notifications enabled (GitHub issues on critical failures)
- [ ] PR checks required before merge (Settings > Branches > Require)
- [ ] Cron schedule reviewed (nightly 2 AM OK per te?)

Dopo setup:

```bash
# Testa locally once
npx ts-node agents/runner.ts --workflow pr

# Push & verifica GitHub Actions green
git push origin feature-branch

# Done! CI ora runs su ogni PR
```

---

## 📈 Metrics to Track

Per capire health progetto over time:

| Metric                       | Healthy | Warning   | Critical |
| ---------------------------- | ------- | --------- | -------- |
| Parser regression catch rate | 100%    | >95%      | <95%     |
| Fitting QA R² score          | >0.90   | 0.85-0.90 | <0.85    |
| Data integrity pass rate     | 100%    | >95%      | <95%     |
| UI smoke test duration       | <30s    | <60s      | >60s     |
| Docs drift items             | 0       | 1-2       | >2 open  |

Ogni settimana, rivedi `.agent-reports/` per trend.

---

## 🆘 Troubleshooting

### "Agent not found in config"

```bash
# Check config syntax
cat agents/config.json | npx json

# Verify agent name spelling
npx ts-node agents/runner.ts
```

---

### "Timeout exceeded"

Agent ran >30s per data-integrity, >60s parser, etc.

**Cause**: Fixture too large, or agent logic unoptimized

**Fix**:

```bash
# Reduce scope
npx ts-node agents/runner.ts --agent parser-resilience \
  --testDataPath="test-fixtures/small/"

# Or increase timeout in agents/config.json
```

---

### "IPC Audit: No timeout detected"

Significa che `electron/main.mjs` handle non ha timeout.

**Fix**:

```typescript
// electron/main.mjs
ipcMain.handle("store:get", async (event, key) => {
  // Aggiungi timeout di 30 sec
  return Promise.race([
    electronStore.get(key),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 30000),
    ),
  ]);
});
```

---

## 📚 Further Reading

- [AGENTS.md](AGENTS.md) - Detailed agent specs & prompt templates
- [../config.json](../config.json) - Full configuration reference
- [../../DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md) - Dev environment setup
- [../../ELECTRON.md](../../ELECTRON.md) - Electron-specific QA notes

---

## 🎓 Team Onboarding

When new dev joins:

1. Show them this guide (5 min read)
2. Have them run: `npx ts-node agents/runner.ts --workflow pr` (2 min)
3. Show them sample failing agent, how to debug (10 min)
4. Point to `.agent-reports/` for real examples

Done—they now understand QA automation for this project.

---

**Last Updated**: 2026-02-28  
**Maintained by**: DevOps / QA Lead  
**Next review**: 2026-04-15
