import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import request from 'supertest';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [McpServerController],
      providers: [
        MockWinstonProvider,
        {
          provide: McpServerService,
          useValue: { handleRequest: vi.fn().mockResolvedValue(undefined) },
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
