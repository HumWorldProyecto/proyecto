import supertest from 'supertest';

/** Cliente de regresión: autoriza casos funcionales; los tests P12 usan supertest sin envolver. */
export default function authorizedRequest(server: Parameters<typeof supertest>[0]) {
  return supertest.agent(server).set('X-API-Key', process.env.HUMWORLD_API_KEY_WRITE!);
}
