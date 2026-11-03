import { createAddonServer } from './app.js';
import { createYoutubeFinder } from './youtube.js';

const port = Number(process.env.PORT || 7000);
const host = process.env.HOST || '0.0.0.0';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const limit = Number.parseInt(process.env.YOUTUBE_DAILY_SEARCH_LIMIT ?? '80', 10);
const youtube = createYoutubeFinder({
  apiKey: process.env.YOUTUBE_API_KEY,
  dailySearchLimit: Number.isInteger(limit) && limit > 0 ? limit : 80
});
console.log(youtube ? 'YouTube lookup enabled' : 'YOUTUBE_API_KEY not set: no streams will be returned');

const server = createAddonServer({ youtube });
server.listen(port, host, () => console.log(`Naija addon listening on http://${host}:${port}`));

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
