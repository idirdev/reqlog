# reqlog

> **[EN]** Minimal, colorized HTTP request logger middleware for Node.js servers — log method, path, status code and response time in any format.
> **[FR]** Middleware de journalisation HTTP minimal et colorisé pour les serveurs Node.js — journalisez la méthode, le chemin, le code de statut et le temps de réponse dans n'importe quel format.

---

## Features / Fonctionnalités

**[EN]**
- Drop-in middleware compatible with Express, Fastify adapters and raw Node.js `http.createServer`
- Logs after response finish for accurate timing (or `immediate: true` for request-time logs)
- Color-coded method (GET=blue, POST=green, DELETE=red), status (2xx=green, 4xx=yellow, 5xx=red) and timing
- Multiple built-in formats: `default`, `combined`, `short`, `tiny`, `dev`
- Custom output stream (file, stderr, any writable)
- `skip` function to exclude health checks or static assets from logs
- Exposes `FORMATS` map and color helpers for custom formatters
- Zero dependencies — pure Node.js

**[FR]**
- Middleware plug-and-play compatible avec Express, les adaptateurs Fastify et le `http.createServer` Node.js brut
- Journalise après la fin de la réponse pour un timing précis (ou `immediate: true` pour les logs au moment de la requête)
- Méthode colorée (GET=bleu, POST=vert, DELETE=rouge), statut (2xx=vert, 4xx=jaune, 5xx=rouge) et timing
- Plusieurs formats intégrés : `default`, `combined`, `short`, `tiny`, `dev`
- Flux de sortie personnalisé (fichier, stderr, tout writable)
- Fonction `skip` pour exclure les health checks ou les assets statiques des logs
- Aucune dépendance — Node.js pur

---

## Installation

```bash
npm install @idirdev/reqlog
```

---

## API (Programmatic) / API (Programmation)

### Express usage / Utilisation Express

```js
const express = require('express');
const reqlog = require('@idirdev/reqlog');

const app = express();

// Default format / Format par défaut
app.use(reqlog());

// Short format / Format court
app.use(reqlog({ format: 'short' }));

// Dev format with colors / Format dev avec couleurs
app.use(reqlog({ format: 'dev' }));

// Skip health checks / Ignorer les health checks
app.use(reqlog({
  skip: (req) => req.url === '/health' || req.url.startsWith('/static'),
}));

// Write to a log file / Écrire dans un fichier de log
const fs = require('fs');
const stream = fs.createWriteStream('./access.log', { flags: 'a' });
app.use(reqlog({ stream, format: 'combined', colors: false }));

// Log immediately (before response) / Journaliser immédiatement (avant la réponse)
app.use(reqlog({ immediate: true }));
```

### Example Output / Exemple de sortie

```
# default format / format par défaut
GET  /api/users          200  43ms
POST /api/auth/login     200  127ms
GET  /api/users/999      404  8ms
POST /api/data           500  312ms

# combined format / format combined
::1 - - [16/Mar/2026:08:42:11 +0000] "GET /api/users HTTP/1.1" 200 1842 43ms
::1 - - [16/Mar/2026:08:42:15 +0000] "POST /api/auth/login HTTP/1.1" 200 256 127ms
```

### Custom formatter / Formateur personnalisé

```js
const { FORMATS, getStatusColor, getMethodColor } = require('@idirdev/reqlog');

// List built-in formats / Lister les formats intégrés
console.log(Object.keys(FORMATS));
// ['default', 'combined', 'short', 'tiny', 'dev']

// Use color helpers / Utiliser les helpers de couleur
const color = getStatusColor(404);   // yellow
const mc    = getMethodColor('POST'); // green
```

### Raw Node.js http server / Serveur http Node.js brut

```js
const http = require('http');
const reqlog = require('@idirdev/reqlog');

const logger = reqlog({ format: 'tiny' });

const server = http.createServer((req, res) => {
  logger(req, res, () => {
    res.writeHead(200);
    res.end('OK');
  });
});
```

---

## License

MIT — idirdev
