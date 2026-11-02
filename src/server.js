import { createAddonServer } from './app.js';
import { createTmdbCatalogue } from './tmdb.js';

const port = Number(process.env.PORT || 7000);
const host = process.env.HOST || '0.0.0.0';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const tmdb = createTmdbCatalogue({ apiKey: process.env.TMDB_API_KEY });
console.log(tmdb ? 'TMDB catalogue enabled' : 'TMDB_API_KEY not set: catalogues will be empty');
const server = createAddonServer({}, { tmdb });
server.listen(port, host, () => console.log(`Naija addon listening on http://${host}:${port}`));

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
