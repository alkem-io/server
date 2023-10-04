import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CalendarEventModule } from '../event/event.module';
import { Calendar } from './calendar.entity';
import { CalendarResolverFields } from './calendar.resolver.fields';
import { CalendarResolverMutations } from './calendar.resolver.mutations';
import { CalendarService } from './calendar.service';
import { CalendarAuthorizationService } from './calendar.service.authorization';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { StorageBucketResolverModule } from '@services/infrastructure/storage-bucket-resolver/storage.bucket.resolver.module';

@Module({
  imports: [
    ContributionReporterModule,
    CalendarEventModule,
    NamingModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    EntityResolverModule,
    ActivityAdapterModule,
    StorageBucketResolverModule,
    TypeOrmModule.forFeature([Calendar]),
  ],
  providers: [
    CalendarResolverMutations,
    CalendarResolverFields,
    CalendarService,
    CalendarAuthorizationService,
  ],
  exports: [CalendarService, CalendarAuthorizationService],
})
export class CalendarModule {}
