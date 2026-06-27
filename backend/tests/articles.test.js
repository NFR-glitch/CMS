const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server');

let server;

test.before(async () => {
  server = await startServer(0);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/articles mengembalikan array artikel', async () => {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/articles`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
});

test('POST /api/articles membuat artikel baru', async () => {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Artikel Uji',
      content: '<p>Konten uji</p>',
      writer: 'Tester',
      category: 'Teknologi',
      tags: ['uji', 'backend'],
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.title, 'Artikel Uji');
  assert.equal(body.writer, 'Tester');
});
