import { gzipSync } from 'node:zlib';
import express from 'express';
import request from 'supertest';
import { vi } from 'vitest';
import { createJsonBodyParserMiddleware } from './json-body-parser.middleware';

describe('createJsonBodyParserMiddleware MCP decoded entity ceiling', () => {
  const setup = () => {
    const app = express();
    const dispatch = vi.fn();
    app.use(createJsonBodyParserMiddleware('1mb'));
    app.post(/.*/, (req, res) => {
      dispatch();
      res.json(req.body);
    });
    return { app, dispatch };
  };
  it.each([
    '/rest/mcp',
    '/rest/mcp/',
  ])('allows exactly 256 KiB parsed JSON on %s', async path => {
    const h = setup();
    const body = JSON.stringify({ x: 'a'.repeat(256 * 1024 - 8) });
    expect(Buffer.byteLength(body)).toBe(256 * 1024);
    await request(h.app)
      .post(path)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);
    expect(h.dispatch).toHaveBeenCalledOnce();
  });
  it('rejects decoded oversized JSON before dispatch, including compressed entities', async () => {
    const h = setup();
    const body = JSON.stringify({ x: 'a'.repeat(256 * 1024) });
    await request(h.app)
      .post('/rest/mcp')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(413);
    await request(h.app)
      .post('/rest/mcp')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .serialize(() => gzipSync(body) as unknown as string)
      .send({})
      .expect(413);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('preserves the configured JSON ceiling on other routes', async () => {
    const h = setup();
    await request(h.app)
      .post('/other')
      .send({ x: 'a'.repeat(300 * 1024) })
      .expect(200);
  });
});
