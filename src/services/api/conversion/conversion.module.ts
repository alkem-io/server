import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { CalloutTransferModule } from '@domain/collaboration/callout-transfer/callout.transfer.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VirtualActorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@platform/platform/platform.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { InputCreatorModule } from '../input-creator/input.creator.module';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { ConversionService } from './conversion.service';

@Module({
  imports: [
    AuthorizationModule,
    SpaceModule,
    AccountHostModule,
    RoleSetModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    InputCreatorModule,
    NamingModule,
    PlatformModule,
    TemplatesManagerModule,
    InnovationFlowModule,
    TemplateModule,
    CalloutTransferModule,
    VirtualActorModule,
    AiServerAdapterModule,
  ],
  providers: [ConversionService, ConversionResolverMutations],
  exports: [ConversionService, ConversionResolverMutations],
})
export class ConversionModule {}
