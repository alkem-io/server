import { COLLABORATION_SERVICE } from '@common/constants/providers';
import { LogContext } from '@common/enums';
import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { Inject, Injectable, LoggerService, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';

/**
 * Emits the owner-driven lifecycle events (server -> collaboration-service)
 * over the unified collaboration bus (FR-006/FR-007;
 * `contracts/lifecycle-events.md`). Fire-and-forget `emit` via the
 * `COLLABORATION_SERVICE` outbound client (a `@Global()` provider).
 *
 * Encapsulates the named contract in one place so the leaf domain delete
 * methods (`MemoService.deleteMemo`, `WhiteboardService.deleteWhiteboard`) emit
 * exactly once per cascade path. `document.deleted` is idempotent downstream.
 */
@Injectable()
export class CollaborationLifecycleService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    // Optional so unit tests / the schema-bootstrap context that do not wire the
    // outbound client still construct the owning domain services. A missing
    // client degrades to a logged no-op (the collab service materializes/purges
    // lazily — no orphan-on-restart).
    @Optional()
    @Inject(COLLABORATION_SERVICE)
    private readonly collaborationClient?: ClientProxy
  ) {}

  /**
   * Emit `document.deleted { id }` — REQUIRED at the delete-cascade leaves so
   * the collab service disconnects clients, releases the room and purges
   * metadata + blob (no orphan, FR-006/FR-023).
   */
  public emitDocumentDeleted(id: string): void {
    this.emit(CollaborationLifecycleEvent.DELETED, { id });
  }

  /**
   * Emit `document.created { id, contentType, ownerRef }` — OPTIONAL
   * pre-registration of metadata (FR-007).
   */
  public emitDocumentCreated(
    id: string,
    contentType: CollaborationContentType,
    ownerRef?: string
  ): void {
    this.emit(CollaborationLifecycleEvent.CREATED, {
      id,
      contentType,
      ownerRef,
    });
  }

  /**
   * Emit `document.access_changed { id }` — OPTIONAL re-evaluation of connected
   * clients when the entity's authorization is recomputed (FR-007).
   */
  public emitDocumentAccessChanged(id: string): void {
    this.emit(CollaborationLifecycleEvent.ACCESS_CHANGED, { id });
  }

  private emit(
    pattern: CollaborationLifecycleEvent,
    payload: Record<string, unknown>
  ): void {
    if (!this.collaborationClient) {
      this.logger.warn?.(
        `Collaboration lifecycle client unavailable; skipped '${pattern}'`,
        LogContext.COLLABORATION
      );
      return;
    }
    try {
      this.collaborationClient.emit(pattern, payload);
    } catch (e: any) {
      // Fire-and-forget: a failed emit must never break the owning operation
      // (e.g. a delete). The collab service is idempotent and lazily
      // materializes/purges, so a dropped event is recoverable.
      this.logger.error?.(
        `Failed to emit collaboration lifecycle event '${pattern}': ${e?.message}`,
        e?.stack,
        LogContext.COLLABORATION
      );
    }
  }
}
