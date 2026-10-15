import { gzipSync } from 'node:zlib';
import { WinstonConfigService } from '@config/winston.config';
import { GraphqlExceptionFilter } from '@core/error-handling/graphql.exception.filter';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';
import { UnhandledExceptionFilter } from '@core/error-handling/unhandled.exception.filter';
import { Test } from '@nestjs/testing';
import express from 'express';
import { WinstonLogger } from 'nest-winston';
import request from 'supertest';
import { vi } from 'vitest';
import { createLogger } from 'winston';
import { createJsonBodyParserMiddleware } from './json-body-parser.middleware';

describe('MCP parser diagnostics through initialized Nest and JSON logging', () => {
  it('keeps malformed body fragments out of the response and formatted logs', async () => {
    const options = await new WinstonConfigService({
      get: (key: string) =>
        ({
          'monitoring.logging.console_logging_enabled': true,
          'monitoring.logging': { json: true },
          'monitoring.logging.level': 'error',
          'monitoring.logging.context_to_file': { enabled: false },
        })[key],
    } as any).createWinstonModuleOptions();
    const formatted: string[] = [];
    const transport = options.transports[0];
    const output = vi
      .spyOn(transport, 'log')
      .mockImplementation((info: any, callback: any) => {
        formatted.push(info[Symbol.for('message')]);
        callback();
      });
    const winston = createLogger(options);
    const logger = new WinstonLogger(winston);
    const module = await Test.createTestingModule({}).compile();
    const app = module.createNestApplication({
      bodyParser: false,
      logger: false,
    });
    const dispatch = vi.fn();
    app.use(createJsonBodyParserMiddleware('1mb'));
    app.getHttpAdapter().post('/rest/mcp', (_req, res) => {
      dispatch();
      res.json({ ok: true });
    });
    app.useGlobalFilters(
      new UnhandledExceptionFilter(logger),
      new GraphqlExceptionFilter(logger),
      new HttpExceptionFilter(logger)
    );
    try {
      await app.init();
      for (const body of [
        '{"operations":[{"op":"addText","text":"SYNTHETIC_PRIVATE_TEXT"}],"truncated":',
        '{"x": S3NTINEL}',
      ]) {
        const response = await request(app.getHttpServer())
          .post('/rest/mcp')
          .set('Content-Type', 'application/json')
          .send(body)
          .expect(400);
        expect(JSON.stringify(response.body)).not.toMatch(/SYNTHETIC|S3NTINEL/);
      }
      expect(formatted).toHaveLength(2);
      expect(formatted.join('\n')).not.toMatch(/SYNTHETIC|S3NTINEL|"body":/);
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      await app.close();
      winston.close();
      output.mockRestore();
    }
  });
});

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
