import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { Timeline } from './timeline.entity';
import { TimelineResolverFields } from './timeline.resolver.fields';
import { TimelineService } from './timeline.service';
import { TimelineAuthorizationService } from './timeline.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CalendarModule,
    TypeOrmModule.forFeature([Timeline]),
  ],
  providers: [
    TimelineResolverFields,
    TimelineService,
    TimelineAuthorizationService,
  ],
  exports: [TimelineService],
})
export class TimelineModule {}
