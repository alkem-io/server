import express from 'express';
import request from 'supertest';
import { createJsonBodyParserMiddleware } from './json-body-parser.middleware';

describe('createJsonBodyParserMiddleware', () => {
  it('parses JSON for MCP API key management routes', async () => {
    const app = express();
    app.use(createJsonBodyParserMiddleware('1mb'));
    app.post('/rest/mcp/api-keys', (req, res) => {
      res.json(req.body);
    });

    const payload = {
      name: 'codex-valentin',
      scopes: [{ operations: ['read', 'tools'] }],
    };

    await request(app)
      .post('/rest/mcp/api-keys')
      .send(payload)
      .expect(200, payload);
  });

  it.each([
    '/rest/mcp',
    '/rest/mcp/',
  ])('leaves the MCP transport request body unconsumed for %s', async path => {
    const app = express();
    app.use(createJsonBodyParserMiddleware('1mb'));
    app.post(path, (req, res) => {
      let rawBody = '';
      req.setEncoding('utf8');
      req.on('data', chunk => {
        rawBody += chunk;
      });
      req.on('end', () => {
        res.type('application/json').send(rawBody);
      });
    });

    const payload = { jsonrpc: '2.0', method: 'tools/list', id: 1 };

    await request(app).post(path).send(payload).expect(200, payload);
  });
});
