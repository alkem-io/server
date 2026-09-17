import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { McpAuthGuard } from './auth/mcp-auth.guard';
import { McpServerController } from './mcp-server.controller';
import { McpServerService } from './mcp-server.service';

/**
 * workspace#038 (R-038-2 / R-038-8, US3-AS3): the three former
 * `/rest/mcp/api-keys` lifecycle handlers were DELETED, not deprecated —
 * they were internet-reachable and guarded only by `McpAuthGuard`, so a
 * leaked MCP key could mint further MCP keys. This spec asserts the closure:
 * none of the three verbs resolve to a route any more. Nest's router 404s
 * before `McpAuthGuard` (or anything else) runs, since no handler is
 * registered for the sub-path.
 */
describe('McpServerController — deleted /rest/mcp/api-keys surface (US3-AS3)', () => {
  let app: INestApplication;
  // The controller hands the raw ServerResponse to the service and writes
  // nothing itself, so the mock must end the response or the request hangs.
  const mcpServerService = {
    handleRequest: vi.fn(async (_req: unknown, res: any) => {
      res.statusCode = 200;
      res.end();
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [McpServerController],
      providers: [
        MockWinstonProvider,
        {
          provide: McpServerService,
          useValue: mcpServerService,
        },
      ],
    })
      .overrideGuard(McpAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Positive control. Without it, all three 404 assertions below would still
  // pass if the controller were mounted under a different base path, or not
  // mounted at all — proving nothing about the deleted lifecycle surface.
  // This anchors '/rest/mcp' as live before we assert its sub-path is gone.
  it('POST /rest/mcp still resolves to the MCP handler', async () => {
    await request(app.getHttpServer()).post('/rest/mcp').send({});
    expect(mcpServerService.handleRequest).toHaveBeenCalled();
  });

  it('POST /rest/mcp/api-keys returns 404', async () => {
    await request(app.getHttpServer())
      .post('/rest/mcp/api-keys')
      .send({ name: 'x' })
      .expect(404);
  });

  it('GET /rest/mcp/api-keys returns 404', async () => {
    await request(app.getHttpServer()).get('/rest/mcp/api-keys').expect(404);
  });

  it('DELETE /rest/mcp/api-keys/:id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/rest/mcp/api-keys/some-id')
      .expect(404);
  });
});
