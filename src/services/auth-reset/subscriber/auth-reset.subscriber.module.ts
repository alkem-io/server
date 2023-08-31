import { Global, Module } from '@nestjs/common';
import { AuthResetController } from './auth-reset.controller';
import { SpaceModule } from '@domain/challenge/space/space.module';
import { UserModule } from '@domain/community/user/user.module';
import { PlatformModule } from '@platform/platfrom/platform.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';

@Global()
@Module({
  imports: [SpaceModule, UserModule, PlatformModule, OrganizationModule],
  controllers: [AuthResetController],
})
export class AuthResetSubscriberModule {}
