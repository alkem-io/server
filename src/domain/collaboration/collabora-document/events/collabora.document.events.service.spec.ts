import { ActorContext } from '@core/actor-context/actor.context';
import {
  COLLABORA_DOCUMENT_OPENED,
  COLLABORA_DOCUMENT_REPLACED,
  COLLABORA_DOCUMENT_UPLOADED,
  CollaboraDocumentOpened,
  CollaboraDocumentReplaced,
  CollaboraDocumentUploaded,
} from '@domain/collaboration/collabora-document/events/collabora.document.analytics.events';
import { CollaboraDocumentEventsService } from '@domain/collaboration/collabora-document/events/collabora.document.events.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('CollaboraDocumentEventsService', () => {
  let eventEmitter: EventEmitter2;
  let service: CollaboraDocumentEventsService;
  let actorContext: ActorContext;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    service = new CollaboraDocumentEventsService(eventEmitter);
    actorContext = Object.assign(new ActorContext(), {
      actorID: 'actor-1',
      isAnonymous: false,
      isGuest: true,
      guestName: 'Guest One',
      credentials: [{ type: 'space-admin', resourceID: 'space-1' }],
      authenticationID: 'authentication-1',
      expiry: 100,
      absoluteExpiry: 200,
      issuedAt: 50,
      delegationContext: {
        assistantActorId: 'assistant-1',
        onBehalfOfUserId: 'actor-1',
      },
    });
  });

  it.each([
    {
      publish: 'publishOpened' as const,
      eventName: COLLABORA_DOCUMENT_OPENED,
      eventType: CollaboraDocumentOpened,
    },
    {
      publish: 'publishReplaced' as const,
      eventName: COLLABORA_DOCUMENT_REPLACED,
      eventType: CollaboraDocumentReplaced,
    },
    {
      publish: 'publishUploaded' as const,
      eventName: COLLABORA_DOCUMENT_UPLOADED,
      eventType: CollaboraDocumentUploaded,
    },
  ])('$publish synchronously emits a frozen typed event with minimal attribution', ({
    publish,
    eventName,
    eventType,
  }) => {
    let received: unknown;
    eventEmitter.on(eventName, event => {
      received = event;
      return new Promise(() => undefined);
    });
    const emitSpy = vi.spyOn(eventEmitter, 'emit');
    const emitAsyncSpy = vi.spyOn(eventEmitter, 'emitAsync');

    const result = service[publish](
      'collabora-document-1',
      'Document One',
      actorContext
    );

    expect(result).toBeUndefined();
    expect(received).toBeInstanceOf(eventType);
    expect(received).toMatchObject({
      id: 'collabora-document-1',
      name: 'Document One',
      actorAttribution: {
        actorID: 'actor-1',
        isAnonymous: false,
        guestName: 'Guest One',
      },
    });
    const event = received as CollaboraDocumentOpened;
    expect(Object.keys(event.actorAttribution).sort()).toEqual([
      'actorID',
      'guestName',
      'isAnonymous',
    ]);
    expect(event.actorAttribution).not.toBe(actorContext);
    expect(Object.isFrozen(event.actorAttribution)).toBe(true);
    expect(Object.isFrozen(event)).toBe(true);
    expect(emitSpy).toHaveBeenCalledOnce();
    expect(emitAsyncSpy).not.toHaveBeenCalled();

    actorContext.actorID = 'mutated-actor';
    actorContext.isAnonymous = true;
    actorContext.guestName = 'Mutated Guest';
    expect(event.actorAttribution).toEqual({
      actorID: 'actor-1',
      isAnonymous: false,
      guestName: 'Guest One',
    });
  });

  it('creates a fresh snapshot and event envelope for every publication', () => {
    const events: CollaboraDocumentOpened[] = [];
    eventEmitter.on(COLLABORA_DOCUMENT_OPENED, event => events.push(event));

    service.publishOpened('document-1', 'Document One', actorContext);
    service.publishOpened('document-1', 'Document One', actorContext);

    expect(events).toHaveLength(2);
    expect(events[0]).not.toBe(events[1]);
    expect(events[0].actorAttribution).not.toBe(events[1].actorAttribution);
  });
});
