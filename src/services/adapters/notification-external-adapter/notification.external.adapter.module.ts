import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationExternalAdapter } from './notification.external.adapter';

@Module({
  imports: [
    ActivityModule,
    UrlGeneratorModule,
    ContributorLookupModule,
    UserLookupModule,
  ],
  providers: [NotificationExternalAdapter],
  exports: [NotificationExternalAdapter],
})
export class NotificationExternalAdapterModule {}
