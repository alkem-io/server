import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { AccountModule } from '@domain/space/account/account.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CommunityRoleModule } from '@domain/community/community-role/community.role.module';
import { CommunityModule } from '@domain/community/community/community.module';

@Module({
  imports: [
    AuthorizationModule,
    AccountModule,
    SpaceModule,
    CommunityModule,
    CommunityRoleModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    CommunicationModule,
  ],
  providers: [ConversionService, ConversionResolverMutations],
  exports: [ConversionService, ConversionResolverMutations],
})
export class ConversionModule {}
