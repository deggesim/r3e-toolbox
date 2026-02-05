# Esempi di Validazione r3e-data.json

Questo documento contiene esempi pratici di utilizzo del sistema di validazione.

## Esempio 1: File Valido Completo

```json
{
  "classes": {
    "1860": {
      "Id": 1860,
      "Name": "GT3",
      "Cars": [{ "Id": 3422 }, { "Id": 4518 }]
    },
    "1867": {
      "Id": 1867,
      "Name": "DTM 2014",
      "Cars": [{ "Id": 2264 }]
    }
  },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": [
        {
          "Id": 263,
          "Name": "Grand Prix",
          "Track": 262,
          "MaxNumberOfVehicles": 38
        },
        {
          "Id": 266,
          "Name": "Bridge",
          "Track": 262,
          "MaxNumberOfVehicles": 38
        }
      ]
    },
    "1670": {
      "Id": 1670,
      "Name": "Monza Circuit",
      "layouts": [
        {
          "Id": 1671,
          "Name": "Grand Prix",
          "Track": 1670,
          "MaxNumberOfVehicles": 58
        }
      ]
    }
  },
  "cars": {
    "3422": {
      "Name": "Audi R8 LMS",
      "Class": 1860
    }
  }
}
```

**Output:**

```
✅ Validazione riuscita
⚠️  Warnings (non bloccanti):
  - Nessun warning
```

## Esempio 2: File con Errore - Classe Senza Id

```json
{
  "classes": {
    "1860": {
      "Name": "GT3"
      // ❌ Manca il campo "Id"
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

**Output:**

```
❌ Errore di validazione
Invalid r3e-data.json structure:

  ❌ Class 1860: missing or invalid 'Id' field
```

## Esempio 3: File con Warning - ID Mismatch

```json
{
  "classes": {
    "1860": {
      "Id": 1999,
      "Name": "GT3"
      // ⚠️ Chiave è 1860 ma Id è 1999
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

**Output:**

```
✅ Validazione riuscita con warnings
⚠️  Class 1860: ID mismatch (key: 1860, Id: 1999)
```

## Esempio 4: File con Track Senza Layouts

```json
{
  "classes": {
    "1860": {
      "Id": 1860,
      "Name": "GT3"
    }
  },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": []
      // ❌ Array vuoto non permesso
    }
  }
}
```

**Output:**

```
⚠️  Track 262 (RaceRoom Raceway): no layouts defined
```

## Esempio 5: JSON Malformato

```json
{
  "classes": {
    "1860": {
      "Id": 1860,
      "Name": "GT3",
    }
  // ❌ Manca parentesi graffa di chiusura
```

**Output:**

```
❌ Errore di parsing
Failed to parse JSON: Unexpected token } in JSON at position 72
```

## Esempio 6: File Minimo Valido

```json
{
  "classes": {
    "1": {
      "Id": 1,
      "Name": "Test Class"
    }
  },
  "tracks": {
    "1": {
      "Id": 1,
      "Name": "Test Track",
      "layouts": [
        {
          "Id": 1,
          "Name": "Test Layout"
        }
      ]
    }
  }
}
```

**Output:**

```
✅ Validazione riuscita
```

## Uso nel Codice

### Esempio A: Validazione Diretta

```typescript
import { validateR3eData } from "./utils/r3eDataValidator";

const data = JSON.parse(fileContent);
const validation = validateR3eData(data);

if (!validation.valid) {
  console.error("Errori:", validation.errors);
  // Mostra errori all'utente
  return;
}

if (validation.warnings.length > 0) {
  console.warn("Warnings:", validation.warnings);
  // Continua comunque
}

// Usa i dati validati
useGameData(data);
```

### Esempio B: Parse e Validazione Combinati

```typescript
import { parseAndValidateR3eData } from "./utils/r3eDataValidator";

try {
  const gameData = parseAndValidateR3eData(fileContent);
  // gameData è tipizzato come RaceRoomData
  setGameData(gameData);
} catch (error) {
  // Gestisci errore
  alert(`Errore nel file: ${error.message}`);
}
```

### Esempio C: Check Rapido

```typescript
import { isValidR3eDataStructure } from "./utils/r3eDataValidator";

const data = JSON.parse(fileContent);

if (!isValidR3eDataStructure(data)) {
  alert("File non valido: struttura base mancante");
  return;
}

// Procedi con validazione completa
const fullValidation = validateR3eData(data);
```

## Testing con File Reali

Per testare la validazione con un file r3e-data.json reale:

```bash
# 1. Copia il file dal gioco
cp "C:\Program Files (x86)\Steam\steamapps\common\raceroom racing experience\Game\GameData\General\r3e-data.json" test-data.json

# 2. Testa nel browser o con Node.js
node -e "
const fs = require('fs');
const { parseAndValidateR3eData } = require('./src/utils/r3eDataValidator');
const content = fs.readFileSync('test-data.json', 'utf-8');
try {
  const data = parseAndValidateR3eData(content);
  console.log('✅ File valido!');
  console.log('Classi:', Object.keys(data.classes).length);
  console.log('Tracks:', Object.keys(data.tracks).length);
} catch (err) {
  console.error('❌ Errore:', err.message);
}
"
```

## Risoluzione Problemi Comuni

### Problema: "Missing or invalid 'classes' property"

**Causa:** Il JSON non ha la proprietà `classes` o non è un oggetto.

**Soluzione:**

```json
// ❌ Sbagliato
{
  "class": { ... }
}

// ✅ Corretto
{
  "classes": { ... }
}
```

### Problema: "Track X: missing or invalid 'layouts' array"

**Causa:** Il track non ha la proprietà `layouts` o non è un array.

**Soluzione:**

```json
// ❌ Sbagliato
{
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "Track"
    }
  }
}

// ✅ Corretto
{
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "Track",
      "layouts": [
        { "Id": 263, "Name": "Layout 1" }
      ]
    }
  }
}
```

### Problema: "Class X: ID mismatch"

**Causa:** La chiave dell'oggetto non corrisponde al campo `Id`.

**Soluzione:**

```json
// ⚠️ Warning (funziona ma inconsistente)
{
  "classes": {
    "1860": {
      "Id": 1999,
      "Name": "GT3"
    }
  }
}

// ✅ Meglio (consistente)
{
  "classes": {
    "1860": {
      "Id": 1860,
      "Name": "GT3"
    }
  }
}
```
