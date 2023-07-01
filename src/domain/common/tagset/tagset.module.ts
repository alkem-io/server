import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { Tagset } from './tagset.entity';
import { TagsetService } from './tagset.service';
import { TagsetResolverFields } from './tagset.resolver.fields';

@Module({
  imports: [AuthorizationPolicyModule, TypeOrmModule.forFeature([Tagset])],
  providers: [TagsetService, TagsetResolverFields],
  exports: [TagsetService],
})
export class TagsetModule {}
