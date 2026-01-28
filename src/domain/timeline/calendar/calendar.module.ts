import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceSettingsModule } from '@domain/space/space.settings/space.settings.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CalendarEventModule } from '../event/event.module';
import { Calendar } from './calendar.entity';
import { CalendarResolverFields } from './calendar.resolver.fields';
import { CalendarResolverMutations } from './calendar.resolver.mutations';
import { CalendarService } from './calendar.service';
import { CalendarAuthorizationService } from './calendar.service.authorization';

@Module({
  imports: [
    ContributionReporterModule,
    CalendarEventModule,
    NamingModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    EntityResolverModule,
    ActivityAdapterModule,
    StorageAggregatorResolverModule,
    SpaceSettingsModule,
    NotificationAdapterModule,
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
