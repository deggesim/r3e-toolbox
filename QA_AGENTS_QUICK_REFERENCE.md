# R3E Toolbox - QA Agents Quick Reference

**Sommario veloce**: 8 agenti specializzati, 5 workflows, automatizzati in CI/CD.

---

## 🎯 Quali Agenti Usiamo?

| Agente                     | Cosa Fa                                       | Quando            | Automat?  |
| -------------------------- | --------------------------------------------- | ----------------- | --------- |
| **Data Integrity**         | Valida schema XML/JSON, unità tempo           | Pre-import, PR    | ✓ PR      |
| **Parser Resilience**      | Testa regressioni parsers, edge cases         | PR merge          | ✓ PR      |
| **Fitting QA**             | Qualità statistica AI fitting                 | Settimanale notte | ✓ Nightly |
| **Results Consistency**    | Coerenza race results, session matching       | Nightly           | ✓ Nightly |
| **Electron IPC & Storage** | Audit IPC, persistenza, quota storage         | Settimanale       | ✓ Weekly  |
| **UI Regression**          | Smoke test pagine, responsive, console health | PR merge          | ✓ PR      |
| **Release**                | Versionamento, build Electron, updater        | Pre-release       | ⚠️ Manual |
| **Docs Drift**             | Sincronizzazione docs vs codice               | Settimanale       | ✓ Weekly  |

---

## 🚀 Come Usarli

### Lanciare Localmente

```bash
# Singolo agente
npm run agent:data-integrity
npm run agent:parser-resilience
npm run agent:fitting-qa
npm run agent:results-consistency
npm run agent:electron-ipc
npm run agent:ui-regression
npm run agent:release
npm run agent:docs-drift

# Workflow (combo agenti)
npm run agent:workflow:pr          # 3 agenti
npm run agent:workflow:nightly     # 2 agenti
npm run agent:workflow:weekly      # 2 agenti
npm run agent:workflow:pre-release # 8 agenti (full suite)

# Tutti gli agenti
npm run agent:all
```

### In CI/CD (Automatico)

- **PR**: Lancia `agent:workflow:pr` automaticamente
- **Nightly** (lunedì+giovedì 2 AM UTC): `agent:workflow:nightly`
- **Weekly** (lunedì+giovedì 2 AM UTC): `agent:workflow:weekly`
- **Pre-release**: Manual trigger → full suite

---

## 📊 Dove Trovare Risultati

Dopo ogni run:

```
.agent-reports/
├── report-202602281430XX.json    # Output JSON strutturato
├── report-202602281200XX.json
└── ...
```

Ogni report contiene:

- Status (pass/warning/fail)
- Dettagli violazioni
- Raccomandazioni fix
- Timing

**Visualizza ultimo report:**

```bash
jq . .agent-reports/report-*.json | tail -100
```

---

## ✓ PR Workflow (Developer)

Quando apri PR:

1. **Automaticamente lancia**:
   - Data Integrity ✓
   - Parser Resilience ✓
   - UI Regression ✓

2. **Se fallisce un agente**:
   - Check GitHub Actions log
   - Review `.agent-reports/` nel PR
   - Fix e push again → re-run automatico

3. **Se tutti verdi**:
   - Procedi con merge
   - Niente blocca PR

```bash
# Puoi anche testare localmente prima di push:
npm run agent:workflow:pr
```

---

## ⚠️ Nightly Warnings (Morning)

Lunedì/giovedì mattina ricevi email se nightly fallisce:

```
Fitting QA: 1 warning
  Track: Silverstone, Class: GT3
  Issue: Monotonicity break skill 60→70
  Recommendation: Review synthetic data for this combo
```

**Azione**: Review issue creato da GitHub Actions, triage se reale.

---

## 🚀 Pre-Release Checklist (Release Lead)

**5 giorni prima release:**

```bash
npm run agent:workflow:pre-release --releaseVersion="1.4.0"
```

Attendi che tutti gli agenti passino ✓. Se qualche agente blocca:

1. Fix il problema
2. Re-run
3. Una volta che dice "ready", procedi a publish

---

## 📚 Full Docs

- **Setup & Maintenance**: [`AGENT_SETUP_MAINTENANCE.md`](AGENT_SETUP_MAINTENANCE.md)
- **Implementation Guide**: [`AGENT_IMPLEMENTATION_GUIDE.md`](AGENT_IMPLEMENTATION_GUIDE.md)
- **Detailed Agent Specs**: [`AGENTS.md`](AGENTS.md)
- **npm Scripts**: [`agents/NPM_SCRIPTS.md`](agents/NPM_SCRIPTS.md)
- **CI/CD Config**: [`.github/workflows/agent-qa-suite.yml`](.github/workflows/agent-qa-suite.yml)

---

## 🆘 Quick Troubleshooting

| Problema           | Soluzione                                           |
| ------------------ | --------------------------------------------------- |
| "Agent not found"  | `npm run agent:help` e controlla nome               |
| Timeout in CI      | Aumenta timeout in `agents/config.json`             |
| False positive     | Valida dato, apri issue se agent bug                |
| Report non salvato | Controlla se `.agent-reports/` creato               |
| Agent disabled     | Abilita in `agents/config.json` → `"enabled": true` |

---

## 📞 Team Contacts

- **QA Lead**: Triage, severity, thresholds
- **DevOps**: CI/CD, infrastructure
- **Senior Dev**: Parsing logic, fitting algorithm

---

**Ultimo aggiornamento**: 2026-02-28  
**Versione**: 1.0 (Operativo)
