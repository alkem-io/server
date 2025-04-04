import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { CalloutTransferModule } from '@domain/collaboration/callout-transfer/callout.transfer.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';

@Module({
  imports: [
    AuthorizationModule,
    SpaceModule,
    AccountHostModule,
    RoleSetModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    PlatformModule,
    TemplatesManagerModule,
    InnovationFlowModule,
    TemplateModule,
    CalloutTransferModule,
    VirtualContributorModule,
    AiServerAdapterModule,
  ],
  providers: [ConversionService, ConversionResolverMutations],
  exports: [ConversionService, ConversionResolverMutations],
})
export class ConversionModule {}
