import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { ContextModule } from '@domain/context/context/context.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from './ecoverse.entity';
import { EcoverseResolverMutations } from './ecoverse.resolver.mutations';
import { EcoverseResolverQueries } from './ecoverse.resolver.queries';
import { EcoverseService } from './ecoverse.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { EcoverseResolverFields } from './ecoverse.resolver.fields';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '../base-challenge/base.challenge.module';

@Module({
  imports: [
    ContextModule,
    CommunityModule,
    ChallengeModule,
    BaseChallengeModule,
    OpportunityModule,
    ProjectModule,
    OrganisationModule,
    TagsetModule,
    UserGroupModule,
    ApplicationModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  providers: [
    EcoverseService,
    EcoverseResolverFields,
    EcoverseResolverQueries,
    EcoverseResolverMutations,
  ],
  exports: [EcoverseService],
})
export class EcoverseModule {}
