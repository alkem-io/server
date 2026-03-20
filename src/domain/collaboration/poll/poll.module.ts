import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PollOptionFieldsResolver } from '@domain/collaboration/poll-option/poll.option.resolver.fields';
import { PollVote } from '@domain/collaboration/poll-vote/poll.vote.entity';
import { PollVoteModule } from '@domain/collaboration/poll-vote/poll.vote.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service/subscription.service.module';
import { PollOption } from '../poll-option/poll.option.entity';
import { PollDataLoader } from './poll.data.loader';
import { Poll } from './poll.entity';
import { PollFieldsResolver } from './poll.resolver.fields';
import { PollMutationsResolver } from './poll.resolver.mutations';
import { PollResolverSubscriptions } from './poll.resolver.subscriptions';
import { PollService } from './poll.service';
import { PollAuthorizationService } from './poll.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ContributionReporterModule,
    EntityResolverModule,
    NotificationAdapterModule,
    PollVoteModule,
    SubscriptionServiceModule,
    TypeOrmModule.forFeature([Poll, PollOption, PollVote]),
  ],
  providers: [
    PollService,
    PollAuthorizationService,
    PollDataLoader,
    PollMutationsResolver,
    PollResolverSubscriptions,
    PollFieldsResolver,
    PollOptionFieldsResolver,
  ],
  exports: [PollService, PollAuthorizationService],
})
export class PollModule {}
