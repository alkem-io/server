import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { ChallengeBaseService } from './challenge.base.service';

@Module({
  imports: [TagsetModule],
  providers: [ChallengeBaseService],
  exports: [ChallengeBaseService],
})
export class ChallengeBaseModule {}
