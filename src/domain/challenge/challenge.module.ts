import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { ChallengeService } from './challenge.service';
import { ChallengeResolver } from './challenge.resolver';
import { ContextModule } from '../context/context.module';
import { TagsetModule } from '../tagset/tagset.module';

@Module({
  imports: [ContextModule, TagsetModule, UserGroupModule],
  providers: [ChallengeService, ChallengeResolver],
  exports: [ChallengeService],
})
export class ChallengeModule {}
