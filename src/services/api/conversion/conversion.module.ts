import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { CalloutTransferModule } from '@domain/collaboration/callout-transfer/callout.transfer.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ClassificationModule } from '@domain/common/classification/classification.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { SpaceMoveRoomsModule } from '@domain/communication/space-move-rooms/space.move.rooms.module';
import { VirtualActorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@platform/platform/platform.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { InputCreatorModule } from '../input-creator/input.creator.module';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { ConversionService } from './conversion.service';

@Module({
  imports: [
    AuthorizationModule,
    SpaceModule,
    SpaceLookupModule,
    AccountHostModule,
    RoleSetModule,
    AuthorizationPolicyModule,
    LicenseModule,
    InputCreatorModule,
    NamingModule,
    PlatformModule,
    TemplatesManagerModule,
    InnovationFlowModule,
    TemplateModule,
    CalloutsSetModule,
    CalloutTransferModule,
    ClassificationModule,
    SpaceMoveRoomsModule,
    UrlGeneratorModule,
    VirtualActorModule,
    AiServerAdapterModule,
    NotificationAdapterModule,
    EntityResolverModule,
  ],
  providers: [ConversionService, ConversionResolverMutations],
  exports: [ConversionService, ConversionResolverMutations],
})
export class ConversionModule {}
