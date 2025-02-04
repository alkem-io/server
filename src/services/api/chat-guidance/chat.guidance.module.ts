import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceResolverMutations } from './chat.guidance.resolver.mutations';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    GuidanceReporterModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    RoomModule,
    UserModule,
    PlatformModule,
  ],
  providers: [ChatGuidanceService, ChatGuidanceResolverMutations],
  exports: [ChatGuidanceService, ChatGuidanceResolverMutations],
})
export class ChatGuidanceModule {}
