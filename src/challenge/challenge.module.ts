import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserGroupService } from '../user-group/user-group.service';
import { ChallengeService } from './challenge.service';
import { ChallengeResolver } from './challenge.resolver';

@Module({
  providers: [ChallengeService, UserGroupService, ChallengeResolver],
  imports: [UserGroupModule],
  exports: [ChallengeService],
})
export class ChallengeModule {}
