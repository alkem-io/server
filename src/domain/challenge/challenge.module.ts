import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { ChallengeService } from './challenge.service';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ContextModule } from '@domain/context/context.module';
import { TagsetModule } from '@domain/tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { UserModule } from '@domain/user/user.module';
import { OpportunityModule } from '@domain/opportunity/opportunity.module';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { OrganisationModule } from '@domain/organisation/organisation.module';
import { ApplicationModule } from '@domain/application/application.module';

@Module({
  imports: [
    ContextModule,
    TagsetModule,
    OpportunityModule,
    OrganisationModule,
    UserGroupModule,
    UserModule,
    ApplicationModule,
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
