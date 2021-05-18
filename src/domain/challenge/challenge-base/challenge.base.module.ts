import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { ChallengeBaseResolverFields } from './challenge.base.resolver.fields';
import { ChallengeBaseService } from './challenge.base.service';

@Module({
  imports: [TagsetModule],
  providers: [ChallengeBaseService, ChallengeBaseResolverFields],
  exports: [ChallengeBaseService],
})
export class ChallengeBaseModule {}
