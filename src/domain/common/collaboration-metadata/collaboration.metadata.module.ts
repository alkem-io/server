import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationLifecycleDispatcherService } from './collaboration.lifecycle.dispatcher.service';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

/**
 * Provides the collaboration lifecycle outbox writer
 * (`CollaborationLifecycleService.enqueueDocumentDeleted`) to the domain
 * services that own document lifecycle (memo / whiteboard), plus the
 * out-of-band dispatcher that publishes recorded events. The dispatcher's
 * outbound `COLLABORATION_LIFECYCLE_SERVICE` client and `SchedulerRegistry` are
 * both `@Global()`/`@Optional()`, so no extra import is needed here; the
 * dispatcher only starts sweeping where both exist (the API process).
 */
@Module({
  imports: [TypeOrmModule.forFeature([CollaborationLifecycleOutbox])],
  providers: [
    CollaborationLifecycleService,
    CollaborationLifecycleDispatcherService,
  ],
  exports: [CollaborationLifecycleService],
})
export class CollaborationMetadataModule {}
