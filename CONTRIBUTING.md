# Convenzione Commit per Versioning Automatico

Questo progetto usa [Conventional Commits](https://www.conventionalcommits.org/) con **semantic-release** per il versioning automatico.

## Formato Commit

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

## Tipi di Commit e Versioning

### 🐛 fix: → PATCH version (0.0.x)

**Correzione di bug**

```bash
git commit -m "fix: risolto errore nel parsing XML dei tempi qualifica"
git commit -m "fix(ai-management): corretto calcolo regressione lineare"
```

### ✨ feat: → MINOR version (0.x.0)

**Nuova funzionalità**

```bash
git commit -m "feat: aggiunto export CSV per standings"
git commit -m "feat(championship): supporto per calcolo punti personalizzati"
```

### 💥 BREAKING CHANGE: → MAJOR version (x.0.0)

**Modifica architetturale incompatibile**

```bash
git commit -m "feat!: rimosso supporto per vecchio formato XML

BREAKING CHANGE: Il formato XML precedente alla versione 1.0 non è più supportato"
```

Oppure nel footer:

```bash
git commit -m "refactor: ristrutturato sistema di cache assets

BREAKING CHANGE: La cache localStorage ora usa una nuova struttura.
Gli utenti devono ricaricare manualmente i leaderboard assets."
```

## Altri Tipi (non causano release)

- **docs**: Modifiche alla documentazione
- **style**: Formattazione codice (spazi, virgole, etc.)
- **refactor**: Refactoring senza fix o feature → PATCH
- **perf**: Miglioramenti performance → PATCH
- **test**: Aggiunta/modifica test
- **build**: Modifiche al sistema di build
- **ci**: Modifiche ai workflow CI/CD
- **chore**: Manutenzione generica

## Esempi Reali

```bash
# Patch: 0.1.0 → 0.1.1
git commit -m "fix: gestione corretta dei file senza extension"

# Minor: 0.1.1 → 0.2.0
git commit -m "feat: aggiunto supporto per campionati multi-classe"

# Major: 0.2.0 → 1.0.0
git commit -m "feat!: nuovo formato database championship

BREAKING CHANGE: Il formato salvato in localStorage è incompatibile con versioni precedenti"

# Multiple commits in una PR
git commit -m "fix: corretto bug nel calcolo punti"
git commit -m "feat: aggiunto filtro per track"
git commit -m "docs: aggiornato README con esempi"
# → Risultato: MINOR version bump (0.2.0 → 0.3.0)
```

## Scope Suggeriti

- `ai-management`: AI Management feature
- `fix-qualy`: Fix Qualy Times
- `championship`: Build Results Database
- `parser`: XML/JSON parsing utilities
- `fitting`: Fitting statistico
- `assets`: Gestione asset e cache
- `ui`: Componenti UI
- `electron`: Electron main/preload

## Workflow Automatico

1. **Push su `master`**: Attiva semantic-release
2. **Analisi commit**: Determina version bump
3. **Aggiornamento**: package.json + CHANGELOG.md
4. **Tag Git**: Crea tag v1.2.3
5. **GitHub Release**: Pubblica release con note
6. **Build Electron**: Compila e allega installer

## Comandi Utili

```bash
# Verifica commit prima di push
npm run lint

# Simula release (dry-run)
npx semantic-release --dry-run

# Forzare una patch manualmente (se necessario)
npm version patch -m "chore(release): %s"
```

## Note Importanti

- ⚠️ Il commit deve essere nel branch `master` per attivare la release
- 🚀 La release è completamente automatica, non serve creare tag manualmente
- 📝 Il CHANGELOG.md viene generato automaticamente
- 🔖 I tag seguono il formato `v1.2.3`
- ⏭️ I commit con `[skip ci]` non attivano il workflow
