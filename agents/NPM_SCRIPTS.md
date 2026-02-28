# NPM Scripts for Agent QA Orchestration

Aggiungi questi script al `package.json` per lanciare agenti direttamente.

## Come aggiungere

Copia questi oggetti nella sezione `"scripts"` di `package.json`:

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

## Utilizzo

```bash
# Singoli agenti
npm run agent:data-integrity
npm run agent:parser-resilience
npm run agent:fitting-qa
npm run agent:results-consistency
npm run agent:electron-ipc
npm run agent:ui-regression
npm run agent:release
npm run agent:docs-drift

# Workflows
npm run agent:workflow:pr          # 3 agenti: PR check
npm run agent:workflow:nightly     # 2 agenti: Fitting + Results (notte)
npm run agent:workflow:weekly      # 2 agenti: Electron + Docs (settimanale)
npm run agent:workflow:pre-release # 8 agenti: Full suite (release)
npm run agent:workflow:full        # Tutti gli agenti

# Tutti gli agenti
npm run agent:all

# Help
npm run agent:help
```

## Con parametri custom

```bash
# Esegui agent con parametri specifici:
npx ts-node agents/runner.ts --agent data-integrity \
  --filePaths="path/to/file.xml" \
  --strictMode=true

# Oppure con npm run (passando come env):
DATA_FILES="aiadaptation.xml" npm run agent:data-integrity
```

## Cosa fa ogni agente?

| Script                      | Agente              | Descrizione                     |
| --------------------------- | ------------------- | ------------------------------- |
| `agent:data-integrity`      | Data Integrity      | Valida schema XML/JSON/TXT      |
| `agent:parser-resilience`   | Parser Resilience   | Testa regressioni parsers       |
| `agent:fitting-qa`          | Fitting QA          | Qualità statistica fitting AI   |
| `agent:results-consistency` | Results Consistency | Coerenza race results           |
| `agent:electron-ipc`        | Electron IPC        | Audit canali IPC, storage       |
| `agent:ui-regression`       | UI Regression       | Smoke test UI, responsive       |
| `agent:release`             | Release             | Versionamento, build, updater   |
| `agent:docs-drift`          | Docs Drift          | Sincronizzazione docs vs codice |

## Workflows (combo agenti)

| Workflow      | Quando              | Agenti                                | Fail Fast |
| ------------- | ------------------- | ------------------------------------- | --------- |
| `pr`          | Pre-merge PR        | Data Integrity, Parser Resilience, UI | ✓         |
| `nightly`     | Scheduling UTC 2 AM | Fitting QA, Results Consistency       | ✗         |
| `weekly`      | Lunedì/giovedì 2 AM | Electron IPC, Docs Drift              | ✗         |
| `pre-release` | Manual release      | Tutti (full suite)                    | ✓         |
| `full`        | Manual full audit   | Tutti gli agenti                      | ✗         |

## CI/CD Automatico

Workflows configurati in `.github/workflows/agent-qa-suite.yml`:

- **PR**: Lancia `agent:workflow:pr` automaticamente
- **Nightly**: Schedule 2am UTC (lunedì/giovedì)
- **Pre-release**: Manual trigger su GitHub Actions

---

**Note**: Assicura che `agents/runner.ts` e `agents/config.json` siano committati e presenti nel repo.
