import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { Tagset } from './tagset.entity';
import { TagsetService } from './tagset.service';
import { TagsetResolverFields } from './tagset.resolver.fields';
import { TagsetResolverMutations } from './tagset.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([Tagset]),
  ],
  providers: [TagsetService, TagsetResolverFields, TagsetResolverMutations],
  exports: [TagsetService],
})
export class TagsetModule {}
