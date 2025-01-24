import { Global, Module } from '@nestjs/common';
import { AuthResetController } from './auth-reset.controller';
import { SpaceModule } from '@domain/space/space/space.module';
import { UserModule } from '@domain/community/user/user.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { TaskModule } from '@services/task/task.module';
import { AccountModule } from '@domain/space/account/account.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';

@Global()
@Module({
  imports: [
    AuthorizationPolicyModule,
    AccountModule,
    SpaceModule,
    UserModule,
    PlatformModule,
    OrganizationModule,
    OrganizationLookupModule,
    TaskModule,
    AiServerModule,
    LicenseModule,
  ],
  controllers: [AuthResetController],
})
export class AuthResetSubscriberModule {}
