import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { InnovationPack } from './innovation.pack.entity';
import { InnovationPackService } from './innovaton.pack.service';
import { InnovationPackAuthorizationService } from './innovation.pack.service.authorization';
import { InnovationPackResolverFields } from './innovation.pack.resolver.fields';
import { InnovationPackResolverMutations } from './innovation.pack.resolver.mutations';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';

@Module({
  imports: [
    TemplatesSetModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    AccountHostModule,
    TypeOrmModule.forFeature([InnovationPack]),
  ],
  providers: [
    InnovationPackService,
    InnovationPackAuthorizationService,
    InnovationPackResolverFields,
    InnovationPackResolverMutations,
  ],
  exports: [InnovationPackService, InnovationPackAuthorizationService],
})
export class InnovationPackModule {}
