import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationExternalAdapter } from './notification.external.adapter';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [
    ActivityModule,
    EntityResolverModule,
    UrlGeneratorModule,
    ContributorLookupModule,
    UserLookupModule,
  ],
  providers: [NotificationExternalAdapter],
  exports: [NotificationExternalAdapter],
})
export class NotificationExternalAdapterModule {}
