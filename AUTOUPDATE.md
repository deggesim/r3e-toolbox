# Auto-Update System per R3E Toolbox

## Panoramica

Il sistema di auto-aggiornamento utilizza **electron-updater** per controllare automaticamente i nuovi release su GitHub e notificare l'utente.

## Caratteristiche

✅ **Controllo automatico**: Verifica i nuovi release al startup e ogni ora  
✅ **Notifiche personalizzate**: Dialoghi nativi Windows con opzioni di download  
✅ **Download in background**: Non blocca l'interfaccia durante il download  
✅ **Installazione automatica**: Al riavvio viene installata la nuova versione  
✅ **Monitoraggio del progresso**: Notifica visuale della barra di download  
✅ **Controllo manuale**: Menu Help → "Check for Updates"

## Come Funziona

### 1. Configurazione
Nel `package.json` è configurato il publish su GitHub:
```json
"publish": {
  "provider": "github",
  "owner": "deggesim",
  "repo": "r3e-toolbox"
}
```

### 2. Flusso di Aggiornamento

```
[Startup] → Check for Updates (dopo 5 sec)
           ↓
       Update Available → Show Dialog
           ↓
       User clicks "Download Now"
           ↓
       Download Progress (notifica in basso a destra)
           ↓
       Download Complete → Show Install Dialog
           ↓
       User clicks "Install Now" → Riavvia app e installa
```

### 3. Files Interessati

- **`electron/updater.mjs`** - Logica principale di aggiornamento
  - `initAutoUpdater()` - Inizializza il controllo automatico
  - `manualCheckForUpdates()` - Trigger manuale dal menu
  - Event handlers per download/installazione

- **`electron/main.mjs`** - Integrazione updater
  - Importa e inizializza updater all'app start
  - Aggiunge "Check for Updates" nel menu Help

- **`src/hooks/useAutoUpdater.ts`** - Hook React
  - Ascolta i progressi di download
  - Fornisce dati per UI component

- **`src/components/UpdateProgressNotification.tsx`** - UI
  - Mostra barra di download in basso a destra
  - Visualizza percentuale e size

## Comportamento in Modalità Sviluppo

Il sistema è **automaticamente disabilitato** in sviluppo:
```typescript
if (isDev) {
  console.log("[Updater] Running in development mode, auto-updater disabled");
  return;
}
```

## Setup per Deploy

Per fare un release su GitHub:

1. **Push con tag di versione**:
```bash
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

2. **Crea GitHub Release**:
   - Vai a https://github.com/deggesim/r3e-toolbox/releases
   - "Create a new release"
   - Usa il tag v1.4.0
   - Upload gli installer da `dist/`
   - electron-updater leggerà automaticamente i release

3. **electron-builder genererà**:
   - `latest.yml` - Metadata dell'update
   - Windows installer (`.exe`, `.nsis`)
   - electron-updater userà questo per il download

## Note Importanti

⚠️ **GitHub Token**: Se tanti utenti scaricano, il rate limit anonimo (60 req/h) potrebbe non bastare. Solution: Usare `GH_TOKEN` durante il build per il publish.

⚠️ **Code Signing**: Per Windows SmartScreen trusted, il build dovrebbe essere firmato. Attualmente:
```json
"win": {
  "signAndEditExecutable": true  // Placeholder
}
```

⚠️ **Asset Size**: electron-updater farà delta updates (solo differenze). Primo download è ~200MB.

## Testing in Sviluppo

Non puoi testare l'auto-updater in dev mode, ma puoi:
1. Fare un build di produzione: `npm run build:electron`
2. Creare una release su GitHub con il tuo `dist/`
3. Lanciare l'app built: `./dist/R3EToolbox.exe`

Oppure mockare in test, ma non è consigliato per funzionalità critica.

## Disabilitare Temporaneamente

Se serve disabilitare il controllo (per test offline):
```javascript
// In electron/main.mjs
// initAutoUpdater(mainWindow);  // Commenta questa linea
```

## Futuri Miglioramenti

- [ ] Configurare firma dei binari Windows (Code Signing)
- [ ] Aggiungere changelog visibile nel dialogo
- [ ] Supporto per staging/beta releases
- [ ] Notifica quando update è pronto al riavvio successivo
