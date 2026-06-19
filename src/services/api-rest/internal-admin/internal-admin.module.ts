import { Module } from '@nestjs/common';
import { SearchIngestModule } from '@services/api/search/ingest/search.ingest.module';
import { TaskModule } from '@services/task';
import { InAppNotificationAdminModule } from '@src/platform-admin/in-app-notification/in.app.notification.admin.module';
import { InternalAdminController } from './internal-admin.controller';

/**
 * Wires the unauthenticated, in-cluster-only internal admin jobs REST surface.
 *
 * Imports the modules that already provide the services the GraphQL resolvers
 * call — so the REST endpoints reuse the exact same methods (FR-009 parity).
 * Mirrors the `IdentityResolveModule` internal-REST pattern.
 */
@Module({
  imports: [InAppNotificationAdminModule, SearchIngestModule, TaskModule],
  controllers: [InternalAdminController],
})
export class InternalAdminModule {}
