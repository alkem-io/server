import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { LinkService } from './link.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link.entity';
import { LinkAuthorizationService } from './link.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LinkResolverFields } from './link.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LinkResolverMutations } from './link.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TypeOrmModule.forFeature([Link]),
  ],
  providers: [
    LinkResolverMutations,
    LinkService,
    LinkAuthorizationService,
    LinkResolverFields,
  ],
  exports: [LinkService, LinkAuthorizationService],
})
export class LinkModule {}
