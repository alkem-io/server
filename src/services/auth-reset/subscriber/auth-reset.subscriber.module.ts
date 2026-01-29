import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserModule } from '@domain/community/user/user.module';
import { AccountModule } from '@domain/space/account/account.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { Global, Module } from '@nestjs/common';
import { PlatformModule } from '@platform/platform/platform.module';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { TaskModule } from '@services/task/task.module';
import { AuthResetController } from './auth-reset.controller';

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
