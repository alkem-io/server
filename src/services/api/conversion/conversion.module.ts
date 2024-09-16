import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { AccountModule } from '@domain/space/account/account.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';

@Module({
  imports: [
    AuthorizationModule,
    AccountModule,
    SpaceModule,
    CommunityModule,
    RoleSetModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    CommunicationModule,
  ],
  providers: [ConversionService, ConversionResolverMutations],
  exports: [ConversionService, ConversionResolverMutations],
})
export class ConversionModule {}
