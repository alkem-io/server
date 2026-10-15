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
    app.post('/rest/mcp', (req, res) => {
      dispatch();
      res.json(req.body);
    });
    app.post('/other', (req, res) => res.json(req.body));
    return { app, dispatch };
  };
  const sendJson = (
    app: ReturnType<typeof express>,
    path: string,
    bytes: number,
    gzip = false
  ) => {
    const body = '{}' + ' '.repeat(bytes - 2);
    expect(Buffer.byteLength(body)).toBe(bytes);
    const req = request(app).post(path).set('Content-Type', 'application/json');
    if (gzip) req.set('Content-Encoding', 'gzip');
    return req
      .serialize(() => (gzip ? gzipSync(body) : body) as unknown as string)
      .send({});
  };

  describe.each([
    '/rest/mcp',
    '/rest/mcp/',
    '/rest/McP',
    '/rest/McP/',
    '/REST/MCP',
    '/REST/MCP/',
  ])('%s', path => {
    it.each([
      { bytes: 262144, gzip: false, status: 200 },
      { bytes: 262145, gzip: false, status: 413 },
      { bytes: 262144, gzip: true, status: 200 },
      { bytes: 262145, gzip: true, status: 413 },
    ])('bounds $bytes decoded bytes (gzip=$gzip)', async ({
      bytes,
      gzip,
      status,
    }) => {
      const h = setup();
      const response = await sendJson(h.app, path, bytes, gzip).expect(status);
      expect(h.dispatch).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
      if (status === 200) expect(response.body).toEqual({});
    });
  });
  it('preserves the configured JSON ceiling on other routes', async () => {
    const h = setup();
    await sendJson(h.app, '/other', 1024 * 1024).expect(200);
    await sendJson(h.app, '/other', 1024 * 1024 + 1).expect(413);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('does not resolve a double trailing slash to the MCP route', async () => {
    const h = setup();
    await sendJson(h.app, '/rest/mcp//', 262145).expect(404);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
});
