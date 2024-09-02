import { Module } from '@nestjs/common';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { CollaborationFactoryService } from './collaboration.factory.service';
import { CalloutFramingModule } from '../callout-framing/callout.framing.module';
import { CalloutContributionDefaultsModule } from '../callout-contribution-defaults/callout.contribution.defaults.module';
import { CalloutContributionPolicyModule } from '../callout-contribution-policy/callout.contribution.policy.module';
import { CalloutContributionModule } from '../callout-contribution/callout.contribution.module';

@Module({
  imports: [
    CalloutModule,
    CollaborationModule,
    CalloutFramingModule,
    CalloutContributionModule,
    CalloutContributionDefaultsModule,
    CalloutContributionPolicyModule,
  ],
  providers: [CollaborationFactoryService],
  exports: [CollaborationFactoryService],
})
export class CollaborationFactoryModule {}
