import configuration from '@config/configuration';
import { ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types';
import { vi } from 'vitest';
import { CollaborationDocumentService } from './collaboration-document.service';

/**
 * The collaboration-service endpoint CONTRACT. Two load-bearing facts:
 *   A. the real `alkemio.yml` declares `collaboration.service.url` with a
 *      `ws://localhost:4006` default and a `COLLABORATION_SERVICE_URL` override.
 *      That default is for the host-run dev server; container deployments MUST
 *      override it (the queued dev-orchestration / infrastructure-operations PRs
 *      MUST set `COLLABORATION_SERVICE_URL=ws://collaboration-service:4006`) — this
 *      server commit adds no such overlay, only the configurable contract.
 *   B. `CollaborationDocumentService` builds the join URL `/collab/<id>?type=<type>`
 *      and the actor header from those TYPED keys via `ConfigService` inference —
 *      no `collaboration.whiteboard.ws_endpoint` alias and no `:4004` code fallback.
 *
 * Part B/C observe URL construction through the SAME private `newSession` seam the
 * retry spec uses (no production visibility change) and read the built url off the
 * returned session WITHOUT calling `connect()` — the session constructor opens no
 * socket, so this is isolate-safe (no module-registry mock that a sibling spec could
 * defeat under the project's `isolate:false` runner).
 */

// The private `newSession` seam (mirrors collaboration-document.service.spec.ts),
// plus the session's constructor-captured fields we assert on.
type PrivateSession = {
  url: string;
  headers: Record<string, string>;
  documentId: string;
  close: () => void;
};
type WithNewSession = {
  newSession: (id: string, type: string, actor: string) => PrivateSession;
};

const buildService = (url: string): CollaborationDocumentService => {
  const configService = new ConfigService({
    collaboration: {
      service: {
        url,
        actor_id_header: 'X-Alkemio-Actor-Id',
        connect_timeout: 15_000,
        durability_timeout: 20_000,
      },
    },
  });
  const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
  return new CollaborationDocumentService(
    configService as never,
    logger as never
  );
};

describe('CollaborationDocumentService — collaboration.service endpoint contract', () => {
  it('the real alkemio.yml declares collaboration.service.url defaulting to ws://localhost:4006, overridable by COLLABORATION_SERVICE_URL', () => {
    const before = {
      path: process.env.ALKEMIO_CONFIG_PATH,
      url: process.env.COLLABORATION_SERVICE_URL,
    };
    try {
      // Resolve the repo's REAL alkemio.yml via cwd (the factory's default path).
      delete process.env.ALKEMIO_CONFIG_PATH;
      delete process.env.COLLABORATION_SERVICE_URL;
      const def = configuration() as AlkemioConfig;
      expect(def.collaboration.service.url).toBe('ws://localhost:4006');

      process.env.COLLABORATION_SERVICE_URL = 'ws://collaboration-service:4006';
      const overridden = configuration() as AlkemioConfig;
      expect(overridden.collaboration.service.url).toBe(
        'ws://collaboration-service:4006'
      );
    } finally {
      // Exception-safe restore so this test cannot pollute the shared env.
      if (before.path === undefined) delete process.env.ALKEMIO_CONFIG_PATH;
      else process.env.ALKEMIO_CONFIG_PATH = before.path;
      if (before.url === undefined)
        delete process.env.COLLABORATION_SERVICE_URL;
      else process.env.COLLABORATION_SERVICE_URL = before.url;
    }
  });

  it('builds the session URL /collab/<id>?type=<type> and actor header from typed collaboration.service config (no whiteboard/ws_endpoint alias, no :4004 fallback)', () => {
    const service = buildService('ws://localhost:4006');

    // Real newSession → real session constructor (opens no socket); connect() is
    // never called, so nothing dials the endpoint.
    const session = (service as never as WithNewSession).newSession(
      'wb-77',
      'whiteboard',
      'actor-9'
    );
    try {
      expect(session.url).toBe(
        'ws://localhost:4006/collab/wb-77?type=whiteboard'
      );
      expect(session.headers).toEqual({ 'X-Alkemio-Actor-Id': 'actor-9' });
      expect(session.documentId).toBe('wb-77');
    } finally {
      session.close();
    }
  });

  it('trims a trailing slash on the configured url, URL-encodes the documentId, and threads the memo type', () => {
    const service = buildService('ws://localhost:4006/');

    const session = (service as never as WithNewSession).newSession(
      'a/b id',
      'memo',
      'actor-1'
    );
    try {
      expect(session.url).toBe(
        'ws://localhost:4006/collab/a%2Fb%20id?type=memo'
      );
    } finally {
      session.close();
    }
  });
});
