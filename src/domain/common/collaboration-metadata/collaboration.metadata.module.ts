import { Module } from '@nestjs/common';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

/**
 * Provides the confirmed lifecycle publisher to the memo and whiteboard domain
 * services. Its RabbitMQ client is global in the API process and optional so
 * non-deleting worker application contexts can still bootstrap.
 */
@Module({
  providers: [CollaborationLifecycleService],
  exports: [CollaborationLifecycleService],
})
export class CollaborationMetadataModule {}
