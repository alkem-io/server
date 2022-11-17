import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPolicy } from './community.policy.entity';
import { CommunityPolicyResolverFields } from './community.policy.resolver.fields';
import { CommunityPolicyService } from './community.policy.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityPolicy])],
  providers: [CommunityPolicyService, CommunityPolicyResolverFields],
  exports: [CommunityPolicyService],
})
export class CommunityPolicyModule {}
