# R3E Toolbox - Specialized AI Agents

Agenti verticali dedicati per qualità, manutenzione e rilasci. Ogni agente è specializzato in un dominio e produce output standardizzato.

---

## 1. Data Integrity Agent

**Responsabilità**: Validazione schema input (XML/TXT/JSON), coerenza unità tempo, sessioni complete.

### Input Standard

```json
{
  "filePaths": ["path/to/file1.xml", "path/to/file2.txt"],
  "schemaVersion": "r3e-v1",
  "strictMode": true
}
```

### Prompt Dettagliato

```
Analizza i file R3E forniti come input. Verifica:
1. **Schema XML**: elementi validi secondo r3e-data.json, attributi necessari presenti
2. **Unità temporali**: tempi in ms per race results, in sec per aiadaptation.xml
3. **Sessioni complete**: ogni session ha Track/Class/Vehicle/Player/LapData
4. **Array consistency**: usa toArray() - segnala mixing singolo <element> vs <elements>
5. **Valori anomali**: lap times negativi, skill 0-100 fuori range, AI level non integer

Se strictMode=true, blocca file se una sola violazione critica.
Altrimenti segnala con severità.

Output JSON:
{
  "status": "valid|warning|error",
  "file": "path",
  "violations": [
    {
      "severity": "critical|warning|info",
      "category": "schema|unit|range|structure",
      "line": 42,
      "issue": "descrizione",
      "fix": "suggerimento"
    }
  ],
  "summary": {
    "totalFiles": 1,
    "validCount": 0,
    "warningCount": 0,
    "errorCount": 1,
    "blockingIssues": 0
  }
}
```

### Quando Usare

- Pre-import di file utente in app
- Intercettazione early di dati corrotti
- **CI**: Su ogni commit che modifica parsers o test data

### Severity Map

| Severity | Azione         | Blocker |
| -------- | -------------- | ------- |
| critical | Rifiuta import | ✓       |
| warning  | Import con log | ✗       |
| info     | Log silenzioso | ✗       |

---

## 2. Parser Resilience Agent

**Responsabilità**: Scopre regressioni nei parser XML/JSON/TXT, testa edge cases, valida normalizzazioni.

### Input Standard

```json
{
  "parserModules": ["xmlParser.ts", "jsonParser.ts"],
  "testDataPath": "test-fixtures/",
  "edgeCasesEnabled": true,
  "regressionDataset": "aiadaptation-500samples.xml"
}
```

### Prompt Dettagliato

```
Analizza i parser R3E e associati test case:

1. **Regressioni su fixture**: carica test-fixtures/*, esegui parser, confronta output con expected.json
2. **Edge cases**:
   - XML: elemento singolo <Track> vs array <Track><Track>
   - JSON: chiavi mancanti, array vuoti, null values, stringhe numeri
   - TXT: encoding UTF-8 vs ANSI, line endings CRLF vs LF
   - Unità: sec in ms, ms in sec (off-by-1000 comuni)
3. **Array normalization**: verifica toArray() gestisce correttamente singolo vs multiplo
4. **Errori silenziosi**: detecta se parser ignora campi obbligatori senza eccezione
5. **Performance**: Se dataset >10MB, misura tempo parsing (baseline <5sec)

Output JSON:
{
  "parserName": "xmlParser",
  "status": "pass|degrade|fail",
  "regression": {
    "detected": false,
    "failedTests": [],
    "newFailures": ["test-fixtures/aiadaptation-500samples.xml"]
  },
  "edgeCases": [
    {
      "testName": "single-vs-array-mixing",
      "result": "pass|fail",
      "error": "optional error message",
      "recommendation": "fix toArray() logic"
    }
  ],
  "performance": {
    "largeDatasetSize": "10.5 MB",
    "parseTimeMs": 3200,
    "warning": null
  },
  "breakingChanges": []
}
```

### Quando Usare

- **Post-commit**: Su modifica a xmlParser.ts, jsonParser.ts, timeUtils.ts
- **PR review**: Richiedi agent run su cambiamenti parsers
- **Weekly**: Full regression suite su fixture + dataset storico

### Severity Map

| Result  | Azione           |
| ------- | ---------------- |
| pass    | ✓ Proceed        |
| degrade | ⚠️ Manual review |
| fail    | 🛑 Block merge   |

---

## 3. Fitting QA Agent

**Responsabilità**: Valida qualità statistica fitting AI, monotonicità, devianze outlier su dataset reali.

### Input Standard

```json
{
  "aiadaptationXml": "aiadaptation.xml",
  "fittingParams": {
    "testMinAIdiffs": 5,
    "testMaxTimePct": 0.1,
    "testMaxFailsPct": 0.05
  },
  "historicalDataset": "2024_full_races.json",
  "strictMode": false
}
```

### Prompt Dettagliato

```
Esegui QA su fitting AI (src/utils/fitting.ts e databaseProcessor.ts):

1. **Monotonicità**: per ogni Track/Class, verifica che lap time DECRESCENTE con skill livello
   - Se skill1 > skill2 => time1 < time2 (o ≈ con tolleranza)
   - Segnala violazioni con Track/Class/Skill combo
2. **Regressione lineare**:
   - Valida coefficiente slope < 0 (tempo cala con skill)
   - Verifica R² > 0.85 per buona fit
   - Detecta outliers (residui > 3σ)
3. **Parametri validazione**: confronta testMaxTimePct, testMaxFailsPct vs soglie reasonable
   - testMaxTimePct=10% è ragionevole? Magari 8% è più strict
   - testMaxFailsPct=5% è troppo lassista per production?
4. **Dataset storico**: se fornito, rifit su dati passati, confronta predictions vs realtà
   - Generazione sintetica RaceRoom le distorce? Segnala
5. **Regressioni qualità**: accumula score di qualità, allarma se degrada > 5%

Output JSON:
{
  "status": "pass|warning|fail",
  "monotonicity": {
    "checked": 487,
    "violations": 3,
    "details": [
      {
        "track": "Spa",
        "class": "GT3",
        "issue": "skill 60->70: time 1:45.2 -> 1:45.3 (monotonicity break)",
        "severity": "warning"
      }
    ]
  },
  "regression": {
    "avgR2": 0.92,
    "outliers": 12,
    "slopeValidation": "pass",
    "recommendation": null
  },
  "parameterAudit": {
    "testMaxTimePct": {
      "current": 0.1,
      "recommendedRange": [0.06, 0.12],
      "status": "pass"
    }
  },
  "historicalComparison": {
    "datasetSize": 450,
    "accuracyGain": "+2.1%",
    "regressions": 0
  },
  "overallScore": 94,
  "blockingIssues": 0
}
```

### Quando Usare

- **Post-release**: Verifica fitting con dati reali utenti
- **Weekly nightly**: Full audit su track/class matrix
- **Quando si toccano config.ts**: Re-valida tutti i parametri

### Severity Map

| Alert   | Azione                    |
| ------- | ------------------------- |
| pass    | ✓ OK                      |
| warning | ⚠️ Log, monitor           |
| fail    | 🛑 Revert fitting changes |

---

## 4. Results Consistency Agent

**Responsabilità**: Verifica coerenza race results (Practice/Qualify/Race matching, patch tempi, sessioni orfane).

### Input Standard

```json
{
  "resultsPath": "UserData/Log/Results/",
  "sessionPattern": "2025-01-*",
  "validateQualyPatch": true,
  "strictMatching": false
}
```

### Prompt Dettagliato

```
Analizza cartella race results per coerenza:

1. **Session matching**:
   - Per ogni Race, esiste Qualify stesso giorno/track/class?
   - Se manca Qualify, segnala "orphaned Race"
   - Verifica Player/Vehicle/Track consistenza tra sessioni
2. **Qualy patch validation** (Fix Qualy Times feature):
   - Controlla che patch applichi tempi Qualify a Race
   - Valida che tempi spostate siano plausibili (non +50% anomali)
   - Verifica no duplicati/sovrascritti in Race
3. **Lap count**: ogni Race ha minimo N lap? Qualify ha minimo 1 valido?
4. **Timestamp coerenza**: Qualify < Race tempo file filesystem
5. **Orfani**: identifica file Results senza controparte logica
   - Practice isolato non è problema
   - Race senza Qualify è warning
6. **Data quality score**: conta sessioni valide/totali

Output JSON:
{
  "analysisPeriod": "2025-01",
  "totalSessions": 87,
  "summary": {
    "validSessions": 78,
    "orphaned": 5,
    "inconsistent": 4,
    "qualyPatchable": 3
  },
  "issues": [
    {
      "sessionId": "2025_01_15_14_30_00",
      "type": "orphaned_race",
      "sessionType": "Race",
      "track": "Silverstone",
      "issue": "No matching Qualify found",
      "severity": "warning",
      "fixable": true
    }
  ],
  "qualy_patch_analysis": {
    "opportunities": [
      {
        "raceFile": "2025_01_10_Race.txt",
        "qualyFile": "2025_01_10_Qualify.txt",
        "lapTimeDeviation": "+1.2%",
        "status": "safe_to_patch"
      }
    ],
    "warnings": []
  },
  "dataQualityScore": 92,
  "recommendation": "Safe to build championship DB"
}
```

### Quando Usare

- **Pre-championship build**: Valida Results prima che BuildResultsDatabase processi
- **Diagnostica**: User carica cartella Results e vuole audit
- **Weekly**: Monitor cartella Results attiva per degrado qualità

---

## 5. Electron IPC & Storage Agent

**Responsabilità**: Audit canali IPC, serializzazione, rischi persistenza store, fallback localStorage.

### Input Standard

```json
{
  "electronMainPath": "electron/main.mjs",
  "preloadPath": "electron/preload.cjs",
  "storeModulesPath": "src/store/",
  "checkStorageSize": true
}
```

### Prompt Dettagliato

```
Analizza architettura Electron IPC e storage:

1. **Canali IPC**:
   - Verifica ogni ipcMain.handle in main.mjs esista controparte in useElectronAPI hook
   - Controlla che dati serializzabili (no Function/Symbol)
   - Valida timeout ragionevole (<30sec per FS ops)
   - Audit: sensitive data (file paths, personal data) loggati?
2. **Persistenza store**:
   - Per ogni store Zustand: esiste getStorage() call?
   - Electron mode: electron-store usato correttamente?
   - Web mode: fallback localStorage implementato?
   - Valida escape di dati per IPC (sanitizeForIPC)
3. **Storage quota**:
   - Leaderboard assets cache size? (peut exploser)
   - localStorage limite ~5-10MB, quanto è attuale champion DB?
   - Implementato clearAssets() button?
4. **Race condition**: store.get/set/delete sequenze sicure?
5. **Error handling**: cosa succede se IPC fallisce? Retry logic?

Output JSON:
{
  "status": "secure|warning|critical",
  "electronVersion": "40.6.x",
  "ipcAudit": {
    "totalChannels": 12,
    "validated": 12,
    "missing": [],
    "issues": [
      {
        "channel": "store:set",
        "issue": "No timeout, può bloccare renderer",
        "severity": "warning",
        "fix": "Add 30sec timeout"
      }
    ]
  },
  "storagePersistence": {
    "storesCount": 5,
    "electronStoreValid": 5,
    "localStorageFallback": true,
    "missingStores": []
  },
  "storageSize": {
    "leaderboardAssetsEstimate": "2.4 MB",
    "championshipDbEstimate": "1.8 MB",
    "totalEstimate": "4.2 MB",
    "localStorageWarning": false,
    "recommendation": "Within safe limits"
  },
  "securityIssues": [],
  "raceConditions": "none detected",
  "overallScore": 96
}
```

### Quando Usare

- **Pre-release**: Full audit prima packaged build
- **Su modifica IPC**: Dopo cambio main.mjs o preload.cjs
- **Performance complaint**: User dice app lenta → verifica IPC bottleneck

---

## 6. UI Regression Agent

**Responsabilità**: Smoke test pagine principali, flussi critici, responsive check.

### Input Standard

```json
{
  "baseUrl": "http://localhost:5173",
  "screenshotPath": "ui-screenshots/",
  "responsiveSizes": [320, 768, 1920],
  "criticalFlows": ["import_ai_xml", "build_championship", "export_html"]
}
```

### Prompt Dettagliato

```
Esegui smoke test UI per regressioni visive e funzionali:

1. **Layout e responsive**:
   - Carica pagine chiave a 3 viewport: mobile (320px), tablet (768px), desktop (1920px)
   - Sidebar collassa correttamente su mobile? Bottoni clickabili?
   - Form fields e input readabili?
   - Controlla no scrollbar orizzontale unwanted
2. **Flussi critici** (naviga + esegui):
   - AI Management: upload aiadaptation.xml → parse → visualizza levels
   - Fix Qualy Times: upload Practice + Qualify + Race → patch preview
   - Build Results DB: import Results folder → build → export HTML
   - CompletAMENT a fine flusso senza errore console?
3. **Processing log**:
   - Floating log appare quando ops in progress?
   - Auto-collapse fatto dopo completamento?
   - Icone Font Awesome caricate (no broken icons)?
4. **Form validazione**:
   - Upload file con estensione sbagliata → error message?
   - Parametri fuori range → UI abilita/disabilita submit?
5. **Errori console**:
   - No 404 su asset
   - No TypeError/ReferenceError non gestiti
   - No memory leak warnings

Output JSON:
{
  "timestamp": "2026-02-28T14:30:00Z",
  "baseUrl": "http://localhost:5173",
  "overallStatus": "pass|warning|fail",
  "layoutTests": {
    "mobile": { "status": "pass", "issues": [] },
    "tablet": { "status": "pass", "issues": [] },
    "desktop": { "status": "pass", "issues": [] }
  },
  "criticalFlows": [
    {
      "flowName": "import_ai_xml",
      "status": "pass",
      "steps": 5,
      "completionTime": "4.2s",
      "consoleErrors": 0
    }
  ],
  "processingLog": {
    "appOnPageLoad": true,
    "iconsMissing": 0,
    "autoCollapseWorks": true
  },
  "formValidation": [
    {
      "form": "AIManagement",
      "wrongTypeFile": "error shown correctly",
      "status": "pass"
    }
  ],
  "consoleHealth": {
    "errors": 0,
    "warnings": 0,
    "memoryLeaks": "none detected"
  },
  "recordedScreenshots": 18,
  "regressions": 0,
  "recommendations": []
}
```

### Quando Usare

- **Pre-release**: Full smoke test
- **Post-merge**: Su PR che tocca UI/components
- **Settimanale**: Base regression check

---

## 7. Release & AutoUpdate Agent

**Responsabilità**: Prepara release, valida versionamento, controlla updater e packaging.

### Input Standard

```json
{
  "releaseVersion": "1.4.0",
  "changelogPath": "CHANGELOG.md",
  "packageJsonPath": "package.json",
  "electronBuilderConfig": "electron-builder.json",
  "publishTarget": "github|draft"
}
```

### Prompt Dettagliato

```
Prepara e valida release:

1. **Versionamento**:
   - package.json version matches releaseVersion tag?
   - CHANGELOG.md ha entry per questa release con date?
   - Git tag esiste o va creato?
2. **Build Electron**:
   - Run npm run build:electron
   - Controlla se NSIS installer creato senza errori
   - Portable exe exists?
   - Sign status (se su Windows/Mac)?
3. **AutoUpdate setup**:
   - electron-updater configurato in package.json?
   - Verifica che updater.mjs fa check corretto
   - Draft release su GitHub (non public subito)?
   - Versione release math versione nel build?
4. **Assets & distribution**:
   - Controlla dist/ ha web files (index.html, .js, .css)
   - Electron installer file presente e scannable per malware (VirusTotal)?
5. **Changelog quality**:
   - Ha categories: Features, Bugfixes, Breaking Changes?
   - Link a closed issues/PRs?
6. **Rollback plan**:
   - Previous release accessible?
   - Update fallback logic works?

Output JSON:
{
  "releaseVersion": "1.4.0",
  "status": "ready|review_needed|blocked",
  "versioningCheck": {
    "packageJson": "1.4.0 ✓",
    "changelog": "1.4.0 entry found ✓",
    "gitTag": "tag will be created by semantic-release"
  },
  "buildCheck": {
    "electronBuild": "success",
    "installerExists": true,
    "portableExeExists": true,
    "sizeEstimate": "92 MB",
    "warnings": []
  },
  "autoUpdateSetup": {
    "electronUpdaterConfigured": true,
    "draftReleaseReady": false,
    "versionConsistency": "pass"
  },
  "changelogQuality": {
    "hasCategories": true,
    "missingLinks": 0,
    "wordCount": 342,
    "status": "good"
  },
  "preReleaseChecklist": [
    "Ensure commit merged to master",
    "Verify GitHub Release created by CI",
    "Test auto-update on 2 machines before publish",
    "Review installer scan for malware"
  ],
  "estimatedTimeToPublish": "15 minutes",
  "riskLevel": "low"
}
```

### Quando Usare

- **Release day**: Prima di publicare su GitHub
- **Pre-packaging**: Valida electron-builder config
- **Incident**: Auto-update failed → audit updater.mjs

---

## 8. Docs Drift Agent

**Responsabilità**: Confronta comportamento reale vs documentazione, apre task se guide diventano stale.

### Input Standard

```json
{
  "docsPath": "docs/",
  "implementationPath": "src/",
  "checkPaths": [
    "README.md",
    "DEVELOPMENT_GUIDE.md",
    "agents/docs/AGENTS.md",
    "agents/docs/AGENT_IMPLEMENTATION_GUIDE.md",
    "agents/docs/AGENT_SETUP_MAINTENANCE.md",
    "agents/docs/QA_AGENTS_QUICK_REFERENCE.md",
    "agents/docs/QA_AGENTS_ARCHITECTURE.md",
    "agents/docs/AGENT_NEXT_STEPS.md",
    "docs/USER_GUIDE.md"
  ],
  "criticalSections": ["Prerequisites", "Run Dev Environment", "File Locations"]
}
```

### Prompt Dettagliato

```
Analizza se documentazione allineata con implementazione:

1. **Version maturity**:
   - README dice "Node.js 24.x" ma package.json engine dice?
   - Vite versione documentato vs package.json?
   - Quali dipendenze documentate sono outdated (+2 major)?
2. **Procedural docs**:
   - DEVELOPMENT_GUIDE.md: comandi npm ancora funzionano?
   - npm run dev, npm run dev:vite, npm run build:electron ancora validi?
   - Paths electron/main.mjs vs codebase actual structure match?
3. **Config docs**:
   - File locations per Windows still correct?
   - aiadaptation.xml path nel guide vs actual player folder?
4. **API docs** (if present):
   - Funzioni exported da src/utils/ documented?
   - Parametri nel comment match firma funzione?
5. **Architecture diagrams**:
   - Se c'è ASCII/mermaid diagram, riflettono code structure actual?
6. **TODO/FIXME in docs**:
   - Documenti hanno [TODO] non risolti da >30gg?

Output JSON:
{
  "status": "aligned|minor_drift|major_drift",
  "docsAnalyzed": [
    {
      "docFile": "README.md",
      "issues": [
        {
          "section": "Prerequisites",
          "issue": "Node.js 24.x ma package.json engines.node è >=16.0.0",
          "severity": "warning",
          "recommendation": "Update engines.node in package.json to match"
        }
      ]
    }
  ],
  "proceduralOK": [
    "npm run dev ✓",
    "npm run build:electron ✓",
    "File paths Electron ✓"
  ],
  "proceduralDrift": [
    {
      "guide": "DEVELOPMENT_GUIDE.md",
      "step": "Run dev environment",
      "documented": "npm run dev:web (deprecated)",
      "actual": "npm run dev:vite (renamed in v1.3)",
      "severity": "warning"
    }
  ],
  "archDiagrams": {
    "count": 2,
    "aligned": 2
  },
  "todoItems": [
    {
      "docFile": "agents/docs/AGENTS.md",
      "todo": "[TODO] integrate CI workflow template",
      "daysOld": 45,
      "severity": "info"
    }
  ],
  "overallDriftScore": 8,
  "recommendedActions": [
    "Update engines.node constraint",
    "Rename npm run dev:web → dev:vite in docs"
  ],
  "nextAuditDate": "2026-03-28"
}
```

### Quando Usare

- **Monthly**: Full drift scan vs codebase
- **Post-breaking-change**: Se cambi API/structure, audit docs
- **Pre-release**: Verifica guide aggiornate prima publish

---

## Integration: CI/CD & Workflow

### GitHub Actions Template

```yaml
name: Agent QA Suite

on:
  pull_request:
  push:
    branches: [master]
  schedule:
    - cron: "0 2 * * MON" # Weekly Monday night

jobs:
  data-integrity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Data Integrity Agent
        run: |
          npm run agent:data-integrity \
            --testDataPath="test-fixtures/" \
            --strictMode=true

  parser-resilience:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Parser Resilience Agent
        run: npm run agent:parser-resilience \
          --regressionDataset="test-fixtures/large/"

  fitting-qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Fitting QA Agent
        run: npm run agent:fitting-qa \
          --historicalDataset="data/2024_production.json"

  ui-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start dev server
        run: npm run dev:vite &
      - name: Run UI Smoke Tests
        run: npm run agent:ui-regression \
          --baseUrl="http://localhost:5173"

  results-consistency:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Run Results Consistency
        run: npm run agent:results-consistency \
          --resultsPath="${{ secrets.RESULTS_PATH }}" || true
```

### Local Usage

```bash
# Esegui singolo agente
npm run agent:data-integrity --filePaths="aiadaptation.xml"
npm run agent:parser-resilience
npm run agent:fitting-qa
npm run agent:results-consistency --resultsPath="./Results"
npm run agent:electron-ipc
npm run agent:ui-regression
npm run agent:release --releaseVersion="1.4.0"
npm run agent:docs-drift

# Esegui tutti gli agenti
npm run agent:full-suite
```

---

## Severity Legend

| Level            | Meaning              | Action                   |
| ---------------- | -------------------- | ------------------------ |
| ✓ pass           | No issues            | Proceed                  |
| ⚠️ warning       | Minor issues, review | Log & monitor            |
| 🛑 critical/fail | Blocks progress      | Fix before merge/release |

---

## Success Metrics

**Per agente**:

- Data Integrity: 100% file validation pass rate
- Parser Resilience: 0 regression failures
- Fitting QA: Monotonicity violations < 1%, R² > 0.85 avg
- Results Consistency: Data quality score > 85%
- Electron IPC: Response time <2s, 0 timeouts
- UI Regression: 0 console errors, all flows <10s
- Release: 0 blocker issues at publish
- Docs Drift: <5% docs sections stale

**Cadenza agenti**:

- **Per PR**: Data Integrity, Parser Resilience, UI Regression
- **Nightly**: Fitting QA, Results Consistency
- **Weekly**: Electron IPC & Storage, Docs Drift
- **On-demand**: Release & AutoUpdate

---

**Last Updated**: 2026-02-28 | **Version**: 1.0 (Operative)
