# Agents Directory

QA agents specializzati per R3E Toolbox.

---

## 📁 Structure

```
agents/
├── config.json         # Configurazione agenti & workflows
├── runner.ts           # Orchestrator (TypeScript, eseguibile)
├── NPM_SCRIPTS.md      # npm run shortcuts da aggiungere a package.json
└── README.md           # Questo file
```

---

## 🚀 Quickstart

### 1. Verifica Setup

```bash
# Test che runner trovatutto
npx ts-node runner.ts

# Dovrebbe mostrare help + list agenti disponibili
```

### 2. Esegui Workflow

```bash
# PR workflow (3 agenti)
npx ts-node runner.ts --workflow pr

# Full suite (tutti)
npx ts-node runner.ts --agent all
```

### 3. Aggiungi npm scripts (opcional ma consigliato)

Copia i comandi da `NPM_SCRIPTS.md` nel `package.json`:

```bash
# Poi puoi usare:
npm run agent:workflow:pr
npm run agent:data-integrity
# ... etc
```

---

## 📖 Documenti Correlati

**In workspace root:**

- `AGENTS.md` — Detailed specs per cada agente
- `AGENT_IMPLEMENTATION_GUIDE.md` — Practical usage per devs
- `AGENT_SETUP_MAINTENANCE.md` — Setup & maintenance checklists
- `QA_AGENTS_QUICK_REFERENCE.md` — Quick summary

**In .github/workflows/:**

- `agent-qa-suite.yml` — GitHub Actions workflow (CI/CD)

---

## 🎯 Agenti Disponibili

1. **data-integrity** — Schema validation
2. **parser-resilience** — Parser regression testing
3. **fitting-qa** — AI fitting quality
4. **results-consistency** — Race results verification
5. **electron-ipc** — Electron IPC & storage audit
6. **ui-regression** — UI smoke tests
7. **release** — Release preparation
8. **docs-drift** — Documentation sync check

---

## ⚙️ Configuration

Edit `agents/config.json` to:

- Enable/disable agenti
- Change timeout values
- Add custom parameters
- Adjust severity thresholds

---

## 🔧 Development

### Aggiungere Nuovo Agente

1. Aggiungi entry in `config.json`:

   ```json
   "my-agent": {
     "enabled": true,
     "priority": "high",
     "description": "...",
     "timeout": 30000,
     "defaultParams": { /* ... */ }
   }
   ```

2. Implementa logica in `runner.ts` (funzione `runAgent`)

3. Test locally:
   ```bash
   npx ts-node runner.ts --agent my-agent
   ```

### Aggiungere Nuovo Workflow

1. Aggiungi in `config.json`:

   ```json
   "workflows": {
     "my-workflow": {
       "agents": ["agent1", "agent2"],
       "failFast": true
     }
   }
   ```

2. Test:
   ```bash
   npx ts-node runner.ts --workflow my-workflow
   ```

---

## 📊 Reports

Output saved in `.agent-reports/report-*.json` (after each run).

Each report contains:

- agent name
- status (pass/warning/fail)
- timestamp
- execution time
- detailed output

**Visualizza:**

```bash
jq . .agent-reports/report-*.json
```

---

## 🚨 Troubleshooting

### Runner not found

```bash
npx ts-node --version  # Verify ts-node installed
npm ci  # Reinstall deps
```

### Config syntax error

```bash
cat config.json | npx json  # Validate JSON
```

### Agent timeout

- Increase `"timeout"` in `config.json`
- Or reduce scope (fewer fixtures)

---

## 📝 Adding npm Scripts

Recommended: Add these to `package.json` scripts section:

```bash
npm install -g ts-node @types/node   # If not installed
```

Then copy from `NPM_SCRIPTS.md` all scripts into `package.json`.

After that:

```bash
npm run agent:workflow:pr
```

---

**Last Updated**: 2026-02-28  
**Status**: Ready for use
