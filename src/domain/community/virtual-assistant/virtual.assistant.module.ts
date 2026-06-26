import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { VirtualAssistant } from './virtual.assistant.entity';
import { VirtualAssistantResolverFields } from './virtual.assistant.resolver.fields';
import { VirtualAssistantResolverMutations } from './virtual.assistant.resolver.mutations';
import { VirtualAssistantService } from './virtual.assistant.service';
import { VirtualAssistantAuthorizationService } from './virtual.assistant.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    PlatformAuthorizationPolicyModule,
    TypeOrmModule.forFeature([VirtualAssistant]),
  ],
  providers: [
    VirtualAssistantService,
    VirtualAssistantAuthorizationService,
    VirtualAssistantResolverFields,
    VirtualAssistantResolverMutations,
  ],
  exports: [VirtualAssistantService, VirtualAssistantAuthorizationService],
})
export class VirtualAssistantModule {}
