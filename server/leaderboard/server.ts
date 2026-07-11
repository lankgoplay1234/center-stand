import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { CHARACTERS } from '../../src/game/data/CharacterData';
import { createLeaderboardApi } from './LeaderboardApi';
import { FileLeaderboardRepository } from './FileLeaderboardRepository';

const port = parsePort(process.env.LEADERBOARD_PORT);
const host = process.env.LEADERBOARD_HOST?.trim() || '0.0.0.0';
const dataFile = resolve(process.env.LEADERBOARD_DATA_FILE?.trim() || '.data/leaderboard.json');
const allowedOrigin = process.env.LEADERBOARD_ALLOWED_ORIGIN?.trim() || '*';
const repository = new FileLeaderboardRepository(dataFile);
const handler = createLeaderboardApi({
  repository,
  allowedCharacterIds: new Set(CHARACTERS.map((character) => character.id)),
  verifier: {
    verify: async (submission) => submission.verificationToken.startsWith('prototype_'),
  },
});

const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.method === 'OPTIONS') {
      outgoing.writeHead(204, corsHeaders(allowedOrigin));
      outgoing.end();
      return;
    }
    if (incoming.method === 'GET' && incoming.url === '/health') {
      outgoing.writeHead(200, { 'content-type': 'application/json', ...corsHeaders(allowedOrigin) });
      outgoing.end(JSON.stringify({ ok: true }));
      return;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
      else if (value !== undefined) headers.set(name, value);
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of incoming) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    const body = Buffer.concat(chunks);
    const request = new Request(`http://${host}:${port}${incoming.url ?? '/'}`, {
      method: incoming.method,
      headers,
      body: body.byteLength > 0 ? body : undefined,
    });
    const response = await handler(request);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, name) => outgoing.setHeader(name, value));
    for (const [name, value] of Object.entries(corsHeaders(allowedOrigin))) outgoing.setHeader(name, value);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { 'content-type': 'application/json', ...corsHeaders(allowedOrigin) });
    outgoing.end(JSON.stringify({ error: 'internal_error' }));
    console.error('[leaderboard] request failed', error);
  }
});

server.listen(port, host, () => {
  console.log(`[leaderboard] http://${host}:${port} · data ${dataFile}`);
});

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 8787);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : 8787;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  };
}
