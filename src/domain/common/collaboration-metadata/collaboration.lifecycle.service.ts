import { COLLABORATION_LIFECYCLE_SERVICE } from '@common/constants/providers';
import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ClientProxy,
  RmqRecordBuilder,
  type RmqRecordOptions,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';

const PUBLISH_TIMEOUT_MS = 30_000;

/** amqp-connection-manager's per-message timeout is absent from Nest's type. */
type RmqPublishOptions = RmqRecordOptions & { timeout: number };

/**
 * Publishes the sole owner-driven lifecycle event (`document.deleted`) before
 * deletion begins. The dedicated RabbitMQ client uses a durable quorum queue and
 * persistent messages; awaiting the publisher confirm means a successful delete
 * never outruns its eviction signal. If RabbitMQ is unavailable, deletion fails
 * before profile, bucket, authorization, or document state is changed.
 */
@Injectable()
export class CollaborationLifecycleService {
  constructor(
    @Optional()
    @Inject(COLLABORATION_LIFECYCLE_SERVICE)
    private readonly client: ClientProxy | undefined
  ) {}

  public async publishDocumentDeleted(id: string): Promise<void> {
    if (!this.client) {
      throw new Error(
        'CollaborationLifecycleService: COLLABORATION_LIFECYCLE_SERVICE client is unavailable'
      );
    }
    const options: RmqPublishOptions = { timeout: PUBLISH_TIMEOUT_MS };
    const record = new RmqRecordBuilder({ id }).setOptions(options).build();
    await lastValueFrom(
      this.client.emit(CollaborationLifecycleEvent.DELETED, record)
    );
  }
}
