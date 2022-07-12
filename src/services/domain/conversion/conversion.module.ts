import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';

@Module({
  imports: [
    AuthorizationModule,
    HubModule,
    ChallengeModule,
    OpportunityModule,
    CommunityModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunicationModule,
  ],
  providers: [ConversionService, ConversionResolverMutations],
  exports: [ConversionService, ConversionResolverMutations],
})
export class ConversionModule {}
