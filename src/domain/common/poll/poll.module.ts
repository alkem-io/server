import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poll } from './poll.entity';
import { PollService } from './poll.service';
import { PollResolverFields } from './poll.resolver.fields';
import { PollResolverMutations } from './poll.resolver.mutations';
import { PollAuthorizationService } from './poll.service.authorization';
import { ProfileModule } from '../profile/profile.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Poll]),
    ProfileModule,
    AuthorizationPolicyModule,
  ],
  providers: [
    PollService,
    PollResolverFields,
    PollResolverMutations,
    PollAuthorizationService,
  ],
  exports: [PollService, PollAuthorizationService],
})
export class PollModule {}
