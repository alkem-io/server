import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserGroupService } from '../user-group/user-group.service';
import { ChallengeService } from './challenge.service';
import { ChallengeResolver } from './challenge.resolver';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { ContextModule } from '../context/context.module';
import { ContextService } from '../context/context.service';
import { ReferenceModule } from '../reference/reference.module';
import { ReferenceService } from '../reference/reference.service';

@Module({
  imports: [ContextModule, ReferenceModule, UserGroupModule, UserModule],
  providers: [
    ChallengeService,
    ChallengeResolver,
    ContextService,
    ReferenceService,
    UserGroupService,
    UserService,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
