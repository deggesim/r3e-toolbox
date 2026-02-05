# Validazione r3e-data.json

## Panoramica

Il sistema di validazione garantisce che il file `r3e-data.json` caricato (manualmente o automaticamente) rispetti la struttura corretta richiesta dall'applicazione R3E Toolbox.

## Architettura

### File Principale

- **`src/utils/r3eDataValidator.ts`**: Contiene tutte le funzioni di validazione

### Punti di Integrazione

- **`src/components/GameDataOnboarding.tsx`**: Caricamento iniziale (automatico e manuale)
- **`src/store/gameDataStore.ts`**: Store Zustand per i dati validati

## Struttura Validata

### Proprietà Obbligatorie

```typescript
{
  classes: Record<string, RaceRoomClass>,  // Almeno 1 classe richiesta
  tracks: Record<string, RaceRoomTrack>    // Almeno 1 track richiesto
}
```

### Proprietà Opzionali

```typescript
{
  cars?: Record<string, RaceRoomCar>,
  teams?: Record<string, RaceRoomTeam>,
  liveries?: Record<string, any>,
  layouts?: Record<string, any>
}
```

## Validazione Classi

Ogni classe deve avere:

- **`Id`** (number): ID numerico univoco
- **`Name`** (string): Nome della classe
- **`Cars`** (array, opzionale): Lista di auto con `Id` numerico

### Controlli Eseguiti

1. ✅ Presenza di `Id` e `Name`
2. ✅ Tipi corretti (number per Id, string per Name)
3. ⚠️ Consistenza ID (la chiave deve corrispondere a `Id`)
4. ⚠️ Validità array Cars (se presente)

## Validazione Tracks

Ogni track deve avere:

- **`Id`** (number): ID numerico univoco
- **`Name`** (string): Nome del circuito
- **`layouts`** (array): Almeno un layout definito

Ogni layout deve avere:

- **`Id`** (number): ID numerico univoco del layout
- **`Name`** (string): Nome del layout
- **`Track`** (number, opzionale): Riferimento al track padre
- **`MaxNumberOfVehicles`** (number, opzionale): Numero massimo veicoli

### Controlli Eseguiti

1. ✅ Presenza di `Id`, `Name`, `layouts`
2. ✅ Tipi corretti per tutti i campi
3. ✅ Array layouts non vuoto
4. ✅ Ogni layout ha `Id` e `Name` validi
5. ⚠️ Consistenza ID track/layout
6. ⚠️ Validità campi opzionali

## Funzioni API

### `validateR3eData(data: unknown): ValidationResult`

Valida la struttura completa dei dati.

**Parametri:**

- `data`: Oggetto da validare (tipo `unknown`)

**Ritorna:**

```typescript
{
  valid: boolean,           // true se nessun errore critico
  errors: string[],         // Errori bloccanti
  warnings: string[]        // Avvisi non bloccanti
}
```

**Esempio:**

```typescript
const validation = validateR3eData(jsonData);
if (!validation.valid) {
  console.error("Errori:", validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn("Avvisi:", validation.warnings);
}
```

### `parseAndValidateR3eData(content: string): RaceRoomData`

Parsifica JSON e valida in un'unica operazione. Lancia un'eccezione se la validazione fallisce.

**Parametri:**

- `content`: Stringa JSON del file r3e-data.json

**Ritorna:**

- `RaceRoomData`: Dati validati e tipizzati

**Lancia:**

- `Error`: Con messaggio dettagliato se parsing o validazione falliscono

**Esempio:**

```typescript
try {
  const gameData = parseAndValidateR3eData(fileContent);
  // Usa gameData validato
} catch (error) {
  console.error("Validazione fallita:", error.message);
}
```

### `isValidR3eDataStructure(data: unknown): boolean`

Controllo rapido di validità senza messaggi dettagliati.

**Parametri:**

- `data`: Oggetto da verificare

**Ritorna:**

- `boolean`: true se struttura minima valida

**Esempio:**

```typescript
if (isValidR3eDataStructure(parsedJson)) {
  // Procedi con validazione completa
}
```

## Flusso di Validazione

### Caricamento Automatico (Electron)

```
┌─────────────────────────┐
│ Electron IPC Request    │
│ findR3eDataFile()       │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ File trovato in path    │
│ standard RaceRoom       │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ parseAndValidateR3eData │
│ - Parse JSON            │
│ - Valida struttura      │
│ - Log warnings          │
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │ Errore? │
       └────┬────┘
       No   │   Sì
            v    v
    ┌───────┐  ┌──────────────┐
    │ Store │  │ Mostra errore│
    │ dati  │  │ all'utente   │
    └───────┘  └──────────────┘
```

### Caricamento Manuale (Upload File)

```
┌─────────────────────────┐
│ Utente seleziona file   │
│ r3e-data.json           │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ file.text()             │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ parseAndValidateR3eData │
│ - Parse JSON            │
│ - Valida struttura      │
│ - Log warnings          │
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │ Errore? │
       └────┬────┘
       No   │   Sì
            v    v
    ┌───────┐  ┌──────────────┐
    │ Store │  │ Mostra errore│
    │ dati  │  │ nel form     │
    └───────┘  └──────────────┘
```

## Messaggi di Errore

### Errori Critici (Bloccanti)

| Errore                                        | Descrizione                             | Azione                       |
| --------------------------------------------- | --------------------------------------- | ---------------------------- |
| `Invalid data: must be a valid JSON object`   | Dati non sono un oggetto JSON valido    | Verificare formato file      |
| `Missing or invalid 'classes' property`       | Proprietà classes assente o non oggetto | Verificare struttura JSON    |
| `Missing or invalid 'tracks' property`        | Proprietà tracks assente o non oggetto  | Verificare struttura JSON    |
| `Class X: missing or invalid 'Id' field`      | Classe senza ID numerico                | Aggiungere ID alla classe    |
| `Track X: missing or invalid 'layouts' array` | Track senza layouts                     | Aggiungere almeno un layout  |
| `No valid classes found in data`              | Nessuna classe valida presente          | Verificare contenuto classes |
| `No valid tracks found in data`               | Nessun track valido presente            | Verificare contenuto tracks  |

### Avvisi (Non Bloccanti)

| Avviso                                   | Descrizione                | Impatto                             |
| ---------------------------------------- | -------------------------- | ----------------------------------- |
| `Class X: ID mismatch`                   | Chiave diversa da campo Id | Può causare confusione, ma funziona |
| `Track X: no layouts defined`            | Track senza layouts        | Track non utilizzabile              |
| `Class X: N cars with invalid structure` | Cars malformati            | Auto potrebbero non apparire        |

## Test

Eseguire i test di validazione:

```bash
npm run test src/utils/__tests__/r3eDataValidator.test.ts
```

### Copertura Test

- ✅ Validazione struttura corretta
- ✅ Reiezione dati null/undefined
- ✅ Reiezione proprietà mancanti
- ✅ Validazione classi (Id, Name, Cars)
- ✅ Validazione tracks (Id, Name, layouts)
- ✅ Rilevamento ID mismatch
- ✅ Parsing JSON con validazione
- ✅ Gestione JSON malformati
- ✅ Check rapido struttura

## Esempi Pratici

### File Valido Minimo

```json
{
  "classes": {
    "1": {
      "Id": 1,
      "Name": "GT3"
    }
  },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": [
        {
          "Id": 263,
          "Name": "Grand Prix"
        }
      ]
    }
  }
}
```

### File con Errore (Id Mancante)

```json
{
  "classes": {
    "1": {
      "Name": "GT3"
      // ❌ Manca Id
    }
  },
  "tracks": { ... }
}
```

**Errore restituito:**

```
Invalid r3e-data.json structure:
  ❌ Class 1: missing or invalid 'Id' field
```

### File con Warning (ID Mismatch)

```json
{
  "classes": {
    "1": {
      "Id": 2,  // ⚠️ Chiave è "1", ma Id è 2
      "Name": "GT3"
    }
  },
  "tracks": { ... }
}
```

**Warning restituito:**

```
⚠️ Class 1: ID mismatch (key: 1, Id: 2)
```

## Manutenzione

### Aggiungere Nuove Validazioni

1. Aggiornare funzioni in `r3eDataValidator.ts`
2. Aggiungere test corrispondenti in `__tests__/r3eDataValidator.test.ts`
3. Documentare nuove regole in questo file
4. Eseguire test: `npm run test`

### Modificare Struttura Validata

Se la struttura di `RaceRoomData` cambia:

1. Aggiornare `src/types.ts`
2. Aggiornare logica validazione in `r3eDataValidator.ts`
3. Aggiornare test
4. Aggiornare questa documentazione

## Best Practices

1. **Sempre validare**: Non fare mai `JSON.parse()` diretto senza validazione
2. **Gestire errori**: Mostrare messaggi chiari all'utente
3. **Log warnings**: Gli avvisi vanno in console, non bloccano
4. **Test edge cases**: Testare con file reali del gioco
5. **Backup dati**: Incoraggiare utenti a fare backup prima di modifiche

## Risoluzione Problemi

### "Missing or invalid 'classes' property"

- Verificare che il JSON abbia `"classes": { ... }`
- Assicurarsi che sia un oggetto, non un array

### "No valid classes found in data"

- Verificare che ogni classe abbia `Id` (number) e `Name` (string)
- Controllare formato JSON con uno strumento online

### "Track X: missing or invalid 'layouts' array"

- Ogni track deve avere array `layouts`
- Array non può essere vuoto (warning) ma deve esistere

### File r3e-data.json Corrotto

1. Scaricare nuovamente da installazione RaceRoom
2. Path standard: `RaceRoom Racing Experience/Game/GameData/General/r3e-data.json`
3. Usare tool di validazione JSON online per verificare sintassi

## Link Utili

- [Documentazione TypeScript Types](../types.ts)
- [GameDataOnboarding Component](../../components/GameDataOnboarding.tsx)
- [Game Data Store](../../store/gameDataStore.ts)
