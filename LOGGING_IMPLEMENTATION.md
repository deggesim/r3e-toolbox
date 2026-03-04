# Implementazione Sistema di Logging - R3E Toolbox

## Sommario

È stato implementato un sistema completo di logging per l'app R3E Toolbox che salva automaticamente i log su disco in modalità produzione.

## Cosa è stato Fatto

### 1. **Dependency Add**

- ✅ Aggiunto `electron-log` v5.2.0 al `package.json`

### 2. **Configurazione Electron (main.mjs)**

- ✅ Importato `electron-log` e configurato per salvare in `AppData\Roaming\r3e-toolbox\logs\`
- ✅ Impostato limite di rotazione file a 5MB
- ✅ Console methods reindirizzati a electron-log in produzione
- ✅ Diversi livelli per dev vs prod:
  - **Production**: console=info, file=info
  - **Development**: console=debug, file=info

### 3. **IPC Handlers (main.mjs)**

Aggiunti 5 handler IPC per logging:

- `log:info` - Log informativi
- `log:error` - Log errori
- `log:warn` - Log avvertimenti
- `log:debug` - Log debug
- `log:getPath` - Ottieni path cartella logs

### 4. **Preload Bridge (preload.cjs)**

Esposti 5 metodi al renderer process:

- `logInfo(message, metadata)`
- `logError(message, metadata)`
- `logWarn(message, metadata)`
- `logDebug(message, metadata)`
- `getLogsPath()`

### 5. **Type Definitions (src/types/electron.ts)**

- ✅ Aggiunti type per tutti i metodi di logging

### 6. **Hook useLogger (src/hooks/useLogger.ts)**

- ✅ Creato hook React per logging con fallback web (console)
- ✅ Supporta prefix automatico per identificare il componente
- ✅ Async e non-blocking
- ✅ Lavora sia in Electron che web mode

### 7. **Hook useElectronAPI (aggiornato)**

- ✅ Aggiunti metodi `logInfo`, `logError`, `logWarn`, `logDebug`, `getLogsPath`

### 8. **Utility Helpers (src/utils/loggingUtils.ts)**

- ✅ Utility `openLogsFolder()` per aprire cartella con Windows Explorer
- ✅ Utility `getLogsPath()` per ottenere path

### 9. **UI Component (src/components/LoggingSection.tsx)**

- ✅ Componente riusabile che mostra:
  - percorso della cartella logs
  - bottone "Load Path" per caricare il path
  - bottone "Open Logs Folder" per aprire in Windows Explorer
- ✅ Visible solo in Electron mode

### 10. **Settings Page Integration (src/pages/Settings.tsx)**

- ✅ Integrato LoggingSection nella pagina Settings
- ✅ Posizionato dopo la sezione Game Data Management

## Posizione Log File

```
C:\Users\{username}\AppData\Roaming\r3e-toolbox\logs\main.log
```

Esempio:

```
C:\Users\simon\AppData\Roaming\r3e-toolbox\logs\main.log
```

## Come Usare il Logger

### Nel Codice React/TypeScript

```typescript
import { useLogger } from "../hooks/useLogger";

export const MyComponent = () => {
  const logger = useLogger("MyComponent");

  const handleClick = async () => {
    logger.info("Button clicked");
    logger.info("User action", { userId: 123, action: "click" });

    try {
      // operazione
    } catch (error) {
      logger.error("Operation failed", { error: error.message });
    }
  };

  return <button onClick={handleClick}>Click</button>;
};
```

### Livelli di Log

- **info**: Informazioni generali
- **error**: Errori e problemi
- **warn**: Avvertimenti
- **debug**: Info debug (solo dev mode)

### Metadata Opzionale

```typescript
logger.info("File loaded", {
  filename: "aiadaptation.xml",
  size: 1024,
  duration: 234, // ms
});
```

## Differenze Dev vs Production

| Aspetto            | Dev Mode               | Production                          |
| ------------------ | ---------------------- | ----------------------------------- |
| **Console Log**    | debug                  | info                                |
| **File Log Level** | info                   | info                                |
| **File Rotation**  | 5MB                    | 5MB                                 |
| **Dev Tools**      | Automaticamente aperto | Chiuso                              |
| **Path**           | Same                   | `AppData\Roaming\r3e-toolbox\logs\` |

## Settings Page - Nuova Sezione

Nella pagina `/settings` è apparsa una nuova sezione **"Application Logs"** (solo in Electron):

1. **Logs Location** - Campo di testo mostra il percorso completo
2. **Load Path** - Bottone per caricare il percorso
3. **Open Logs Folder** - Bottone per aprire Windows Explorer (disabled finché non carichi il path)

## Configurazione

La configurazione di electron-log in `main.mjs` è customizzabile:

```javascript
log.transports.file.maxSize = 5242880; // 5MB - Cambia per rotazione
log.transports.console.level = isDev ? "debug" : "info";
log.transports.file.level = "info";
```

## Flow di Logging

```
React Component
  ↓
useLogger Hook
  ↓
IPC: ipcRenderer.invoke("log:*")
  ↓
Electron Main Process
  ↓
electron-log
  ↓
File System: AppData\Roaming\r3e-toolbox\logs\main.log
```

## Fallback Web Mode

Quando l'app è in **browser mode** (non Electron):

- ✅ `useLogger` funziona comunque
- ✅ Loga nella console del browser (DevTools → Console)
- ✅ Non persiste su disco (limitazione browser)
- ✅ LoggingSection non è visibile

## Testing

Per testare in development:

```bash
npm run dev  # Avvia Electron con Vite
```

Look per log line nel output della console Electron. Poi:

1. Vai in Settings → Application Logs
2. Clicca "Load Path"
3. Clicca "Open Logs Folder"
4. Dovresti vedere la cartella in Windows Explorer con `main.log`

Per modalità produzione, compila:

```bash
npm run build:electron
```

Poi esegui l'installer creato in `dist/`.

## File Modificati/Creati

### Modificati:

- ✅ `package.json` - Aggiunto electron-log
- ✅ `electron/main.mjs` - Configurazione e handler logging
- ✅ `electron/preload.cjs` - Esposizione metodi logging
- ✅ `src/types/electron.ts` - Type definitions logging
- ✅ `src/hooks/useElectronAPI.ts` - Metodi logging
- ✅ `src/pages/Settings.tsx` - Integrazione LoggingSection
- ✅ `src/hooks/useLogger.ts` - Bugfix console methods

### Creati:

- ✅ `src/hooks/useLogger.ts` - Hook React per logging
- ✅ `src/components/LoggingSection.tsx` - UI component per settings
- ✅ `src/utils/loggingUtils.ts` - Utility helpers
- ✅ `LOGGING.md` - Documentazione sistema

## Risoluzione Problemi

### I log non vengono creati

1. Verifica di essere in **modalità produzione** (non `npm run dev`)
2. Controlla che `C:\Users\{username}\AppData\Roaming\r3e-toolbox\` sia accessibile
3. Verifica i permessi di scrittura

### La cartella logs non esiste

- Verrà creata automaticamente al primo log
- Se non viene creata, controlla i permessi

### Log file è troppo grande

- Modifica `maxSize` in `main.mjs` per rotazione più frequente
- Log vecchi vengono automaticamente archiviati

## Note di Implementazione

1. **Serializzazione IPC**: electron-log e Zustand usano `sanitizeForIPC()` per serializzare oggetti complessi
2. **Asincrono**: Tutti i log sono asincroni ma non bloccano l'UI
3. **Main + Renderer**: Entrambi i processi loggano nello stesso file
4. **No Dependencies**: electron-log non dipende da altre librerie esterne
5. **Performance**: Logging è molto veloce, safe da usare ovunque

## Compatibilità

- Windows: ✅ Testato
- macOS: ✅ Dovrebbe funzionare (path è dinamico)
- Linux: ✅ Dovrebbe funzionare (path è dinamico)
- Web Browser: ✅ Fallback a console

---

**Status**: ✅ **Implementato e Compilato**
**Build**: npm run build ✅ Successful
**Data**: March 4, 2026
