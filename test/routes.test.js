import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../app.js';

const startTestServer = () => new Promise((resolve, reject) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
  server.once('error', reject);
});

const jsonRequest = (path, body, headers = {}) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

let server;
let baseUrl;

test.before(async () => {
  server = await startTestServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('serves the frontend and returns a JSON 404 for unknown routes', async () => {
  const homepage = await fetch(`${baseUrl}/`);
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /AI Shopping Agent/i);

  const missingRoute = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(missingRoute.status, 404);
  assert.deepEqual(await missingRoute.json(), {
    error: 'Not Found',
    message: 'Cannot GET /api/does-not-exist',
  });
});

test('exposes health and public Razorpay configuration routes', async () => {
  for (const path of ['/health', '/api/health']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.status, 'degraded');
    assert.equal(body.database.status, 'disconnected');
  }

  const config = await fetch(`${baseUrl}/api/config/razorpay`);
  assert.equal(config.status, 200);
  assert.equal(typeof (await config.json()).keyId, 'string');
});

test('rejects invalid chat, order, and order lookup requests before database access', async () => {
  const invalidChat = await jsonRequest('/api/chat', {});
  assert.equal(invalidChat.status, 400);
  assert.equal((await invalidChat.json()).error, 'ValidationError');

  const emptyMessage = await jsonRequest('/api/chat', { sessionId: 'validation-test', message: ' ' });
  assert.equal(emptyMessage.status, 400);
  assert.equal((await emptyMessage.json()).message, 'Message cannot be empty.');

  for (const path of ['/api/order', '/api/orders']) {
    const invalidOrder = await jsonRequest(path, {});
    assert.equal(invalidOrder.status, 400);
    assert.equal((await invalidOrder.json()).error, 'ValidationError');
  }

  for (const path of ['/api/order/not-an-id', '/api/orders/not-an-id']) {
    const invalidOrderId = await fetch(`${baseUrl}${path}`);
    assert.equal(invalidOrderId.status, 400);
    assert.equal((await invalidOrderId.json()).error, 'InvalidOrderId');
  }
});

test('rejects unsigned webhook payloads on both webhook paths', async () => {
  for (const path of ['/webhook/razorpay', '/api/webhook/razorpay']) {
    const response = await jsonRequest(path, {});
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'SignatureMissing');
  }
});

test('limits each chat session after ten requests per minute', async () => {
  for (let requestNumber = 1; requestNumber <= 10; requestNumber++) {
    const response = await jsonRequest('/api/chat', {
      sessionId: 'rate-limit-test',
      message: ' ',
    });
    assert.equal(response.status, 400, `request ${requestNumber} should reach validation`);
  }

  const limitedResponse = await jsonRequest('/api/chat', {
    sessionId: 'rate-limit-test',
    message: ' ',
  });
  assert.equal(limitedResponse.status, 429);
  const body = await limitedResponse.json();
  assert.equal(body.error, 'TooManyRequests');
  assert.ok(body.retryAfter > 0);
});
