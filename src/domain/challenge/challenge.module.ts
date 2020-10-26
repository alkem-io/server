import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { ChallengeService } from './challenge.service';
import { ChallengeResolver } from './challenge.resolver';
import { ContextModule } from '../context/context.module';
import { TagsetModule } from '../tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { UserModule } from '../user/user.module';
import { OpportunityModule } from '../opportunity/opportunity.module';

@Module({
  imports: [
    ContextModule,
    TagsetModule,
    OpportunityModule,
    UserGroupModule,
    UserModule,
    TypeOrmModule.forFeature([Challenge]),
  ],
  providers: [ChallengeService, ChallengeResolver],
  exports: [ChallengeService],
})
export class ChallengeModule {}
