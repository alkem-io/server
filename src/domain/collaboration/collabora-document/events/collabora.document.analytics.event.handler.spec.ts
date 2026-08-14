import { LogContext } from '@common/enums';
import { CollaboraDocumentAnalyticsEventHandler } from '@domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler';
import {
  COLLABORA_DOCUMENT_OPENED,
  COLLABORA_DOCUMENT_REPLACED,
  COLLABORA_DOCUMENT_UPLOADED,
  CollaboraDocumentOpened,
  CollaboraDocumentReplaced,
  CollaboraDocumentUploaded,
} from '@domain/collaboration/collabora-document/events/collabora.document.analytics.events';
import { LoggerService } from '@nestjs/common';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

describe('CollaboraDocumentAnalyticsEventHandler', () => {
  let resolver: Mocked<CommunityResolverService>;
  let reporter: Mocked<ContributionReporterService>;
  let logger: Mocked<LoggerService>;
  let handler: CollaboraDocumentAnalyticsEventHandler;

  beforeEach(() => {
    resolver = {
      getLevelZeroSpaceIdForCollaboraDocument: vi
        .fn()
        .mockResolvedValue('space-level-zero'),
    } as any;
    reporter = {
      collaboraDocumentOpened: vi.fn(),
      calloutCollaboraDocumentReplaced: vi.fn(),
      calloutCollaboraDocumentUploaded: vi.fn(),
    } as any;
    logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      fatal: vi.fn(),
    } as any;
    handler = new CollaboraDocumentAnalyticsEventHandler(
      resolver,
      reporter,
      logger
    );
  });

  it.each([
    {
      handle: 'handleOpened' as const,
      eventName: COLLABORA_DOCUMENT_OPENED,
      event: new CollaboraDocumentOpened('document-opened', 'Opened', {
        actorID: 'actor-1',
        isAnonymous: false,
        guestName: undefined,
      }),
      reporterMethod: 'collaboraDocumentOpened' as const,
    },
    {
      handle: 'handleReplaced' as const,
      eventName: COLLABORA_DOCUMENT_REPLACED,
      event: new CollaboraDocumentReplaced('document-replaced', 'Replaced', {
        actorID: 'actor-2',
        isAnonymous: false,
        guestName: 'Guest Two',
      }),
      reporterMethod: 'calloutCollaboraDocumentReplaced' as const,
    },
    {
      handle: 'handleUploaded' as const,
      eventName: COLLABORA_DOCUMENT_UPLOADED,
      event: new CollaboraDocumentUploaded('document-uploaded', 'Uploaded', {
        actorID: 'actor-3',
        isAnonymous: true,
        guestName: undefined,
      }),
      reporterMethod: 'calloutCollaboraDocumentUploaded' as const,
    },
  ])('$eventName maps to $reporterMethod with one lookup and one timing record', async ({
    handle,
    eventName,
    event,
    reporterMethod,
  }) => {
    await handler[handle](event as any);

    expect(
      resolver.getLevelZeroSpaceIdForCollaboraDocument
    ).toHaveBeenCalledOnce();
    expect(
      resolver.getLevelZeroSpaceIdForCollaboraDocument
    ).toHaveBeenCalledWith(event.id);
    expect(reporter[reporterMethod]).toHaveBeenCalledWith(
      { id: event.id, name: event.name, space: 'space-level-zero' },
      event.actorAttribution
    );
    expect(logger.log).toHaveBeenCalledOnce();
    expect(logger.log).toHaveBeenCalledWith(
      {
        message: 'Collabora document analytics space lookup completed',
        eventName,
        collaboraDocumentId: event.id,
        outcome: 'success',
        durationMs: expect.any(Number),
      },
      LogContext.COLLABORATION
    );
    const timing = (logger.log as any).mock.calls[0][0];
    expect(timing.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('contains lookup failure and records exactly one failed lookup timing', async () => {
    resolver.getLevelZeroSpaceIdForCollaboraDocument.mockRejectedValue(
      new Error('lookup failed')
    );
    const event = new CollaboraDocumentOpened('document-1', 'Document One', {
      actorID: 'actor-1',
      isAnonymous: false,
      guestName: undefined,
    });

    await expect(handler.handleOpened(event)).resolves.toBeUndefined();

    expect(reporter.collaboraDocumentOpened).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledOnce();
    expect(logger.log).toHaveBeenCalledWith(
      {
        message: 'Collabora document analytics space lookup completed',
        eventName: COLLABORA_DOCUMENT_OPENED,
        collaboraDocumentId: 'document-1',
        outcome: 'failure',
        durationMs: expect.any(Number),
      },
      LogContext.COLLABORATION
    );
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Failed to process Collabora document analytics',
        eventName: COLLABORA_DOCUMENT_OPENED,
        collaboraDocumentId: 'document-1',
        errorMessage: 'lookup failed',
      },
      expect.stringContaining('Error: lookup failed'),
      LogContext.COLLABORATION
    );
  });

  it('contains a synchronous reporter failure after a successful lookup', async () => {
    reporter.calloutCollaboraDocumentUploaded.mockImplementation(() => {
      throw new Error('reporter failed');
    });
    const event = new CollaboraDocumentUploaded('document-1', 'Document One', {
      actorID: 'actor-1',
      isAnonymous: false,
      guestName: undefined,
    });

    await expect(handler.handleUploaded(event)).resolves.toBeUndefined();

    expect(logger.log).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Failed to process Collabora document analytics',
        eventName: COLLABORA_DOCUMENT_UPLOADED,
        collaboraDocumentId: 'document-1',
        errorMessage: 'reporter failed',
      },
      expect.stringContaining('Error: reporter failed'),
      LogContext.COLLABORATION
    );
  });
});
