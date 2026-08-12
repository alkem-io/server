import { ActorContext } from '@core/actor-context/actor.context';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  COLLABORA_DOCUMENT_OPENED,
  COLLABORA_DOCUMENT_REPLACED,
  COLLABORA_DOCUMENT_UPLOADED,
  CollaboraDocumentActorAttribution,
  CollaboraDocumentOpened,
  CollaboraDocumentReplaced,
  CollaboraDocumentUploaded,
} from './collabora.document.analytics.events';

@Injectable()
export class CollaboraDocumentEventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  public publishOpened(
    id: string,
    name: string,
    actorContext: ActorContext
  ): void {
    const event = new CollaboraDocumentOpened(
      id,
      name,
      this.snapshotActorAttribution(actorContext)
    );
    void this.eventEmitter.emit(COLLABORA_DOCUMENT_OPENED, event);
  }

  public publishReplaced(
    id: string,
    name: string,
    actorContext: ActorContext
  ): void {
    const event = new CollaboraDocumentReplaced(
      id,
      name,
      this.snapshotActorAttribution(actorContext)
    );
    void this.eventEmitter.emit(COLLABORA_DOCUMENT_REPLACED, event);
  }

  public publishUploaded(
    id: string,
    name: string,
    actorContext: ActorContext
  ): void {
    const event = new CollaboraDocumentUploaded(
      id,
      name,
      this.snapshotActorAttribution(actorContext)
    );
    void this.eventEmitter.emit(COLLABORA_DOCUMENT_UPLOADED, event);
  }

  private snapshotActorAttribution(
    actorContext: ActorContext
  ): CollaboraDocumentActorAttribution {
    return Object.freeze({
      actorID: actorContext.actorID,
      isAnonymous: actorContext.isAnonymous,
      guestName: actorContext.guestName,
    });
  }
}
