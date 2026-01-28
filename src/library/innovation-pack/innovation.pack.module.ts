import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationPackDefaultsModule } from './innovation.pack.defaults/innovation.pack.defaults.module';
import { InnovationPack } from './innovation.pack.entity';
import { InnovationPackResolverFields } from './innovation.pack.resolver.fields';
import { InnovationPackResolverMutations } from './innovation.pack.resolver.mutations';
import { InnovationPackService } from './innovation.pack.service';
import { InnovationPackAuthorizationService } from './innovation.pack.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationPackDefaultsModule,
    ProfileModule,
    TemplatesSetModule,
    AccountLookupModule,
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
