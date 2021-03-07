import { ApplicationFactoryModule } from '@domain/community/application/application.factory.module';
import { ContextModule } from '@domain/context/context/context.module';
import { OpportunityModule } from '@domain/challenge/opportunity/opportunity.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ChallengeService } from './challenge.service';

@Module({
  imports: [
    ContextModule,
    TagsetModule,
    OpportunityModule,
    OrganisationModule,
    UserGroupModule,
    UserModule,
    ApplicationFactoryModule,
    TypeOrmModule.forFeature([Challenge]),
  ],
  providers: [
    ChallengeService,
    ChallengeResolverMutations,
    ChallengeResolverFields,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
