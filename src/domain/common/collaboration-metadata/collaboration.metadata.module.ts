import { Module } from '@nestjs/common';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

/**
 * Provides the collaboration lifecycle emitter (`document.deleted`, …) to the
 * domain services that own document lifecycle (memo / whiteboard). The
 * outbound `COLLABORATION_SERVICE` client it depends on is a `@Global()`
 * provider from `MicroservicesModule`, so no extra import is needed here.
 */
@Module({
  providers: [CollaborationLifecycleService],
  exports: [CollaborationLifecycleService],
})
export class CollaborationMetadataModule {}
