# Sistema di Logging

## Overview

Il sistema di logging sincerizza automaticamente i log dell'app in modalità produzione.

### Modalità di Funzionamento

#### Electron (Desktop)

- **Produzione**: Log salvati in `C:\Users\{username}\AppData\Roaming\r3e-toolbox\logs\main.log`
- **Sviluppo**: Log stampati con priorità `debug` in console (File: `info` level)
- **Limite**: Massimo 5MB per file (rotazione automatica)

#### Web (Browser)

- **Fallback**: Console del browser
- **No persistence**: I log non sono persistiti su disco

## Come Usare il Logger

### Nel Codice React

```typescript
import { useLogger } from "../hooks/useLogger";

export const MyComponent = () => {
  const logger = useLogger("MyComponent");

  const handleClick = async () => {
    logger.info("Button clicked", { userId: 123 });
    try {
      // ... operazione
    } catch (error) {
      logger.error("Operation failed", { error: error.message });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
};
```

### Livelli di Log

- **info**: Informazioni generali
- **error**: Errori
- **warn**: Avvertimenti
- **debug**: Debug info (solo in dev mode)

### Metadata

Puoi passare metadata opzionale come secondo parametro:

```typescript
logger.info("User logged in", { username: "john", timestamp: Date.now() });
logger.error("API request failed", { status: 500, endpoint: "/api/data" });
```

## Accesso ai Log

### Via IPC (Electron)

```typescript
import { useElectronAPI } from "../hooks/useElectronAPI";

const MyComponent = () => {
  const { getLogsPath, openExternal } = useElectronAPI();

  const openLogFolder = async () => {
    const path = await getLogsPath();
    console.log("Logs are stored in:", path);
    // Apri la cartella in Windows Explorer
    await openExternal(`file:///${path.replace(/\\/g, "/")}`);
  };

  return <button onClick={openLogFolder}>Open Logs Folder</button>;
};
```

## Log File Format

```
[2026-03-04 14:23:45.123] [INFO]  [MyComponent] Button clicked {"userId": 123}
[2026-03-04 14:23:46.456] [ERROR] [MyComponent] Operation failed {"error": "Network timeout"}
```

## Pulizia dei Log

I log vengono automaticamente ruotati quando superano i 5MB. È possibile configurare questa dimensione modificando `main.mjs`:

```javascript
log.transports.file.maxSize = 5242880; // 5MB
```

## Monitoraggio in Produzione

In modalità produzione:

1. **Tutte le console.\* vengono redirect a electron-log**
2. **I log non vengono stampati in console** (solo file)
3. **Main process e Renderer process usano lo stesso file di log**

### Controllo Livelli in Produzione vs Dev

| Ambiente   | Console | File |
| ---------- | ------- | ---- |
| Produzione | info    | info |
| Sviluppo   | debug   | info |

## Troubleshooting

### I log non vengono creati

- Verificare che l'app sia in **modalità produzione** (not running with `npm run dev`)
- Controllare che la path `C:\Users\{username}\AppData\Roaming\r3e-toolbox\logs\` sia accessibile
- Verificare i permessi di scrittura sulla cartella AppData

### La cartella logs non esiste

- Verrà creata automaticamente al primo avvio
- Se non viene creata, controllare i permessi su AppData\Roaming

### Come rebuilare l'app

```bash
npm run build:electron
```
