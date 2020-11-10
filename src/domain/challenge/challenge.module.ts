import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { ChallengeService } from './challenge.service';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ContextModule } from '../context/context.module';
import { TagsetModule } from '../tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { UserModule } from '../user/user.module';
import { OpportunityModule } from '../opportunity/opportunity.module';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { OrganisationModule } from '../organisation/organisation.module';

@Module({
  imports: [
    ContextModule,
    TagsetModule,
    OpportunityModule,
    OrganisationModule,
    UserGroupModule,
    UserModule,
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
