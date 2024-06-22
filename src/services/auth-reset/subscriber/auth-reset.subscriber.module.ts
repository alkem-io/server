import { Global, Module } from '@nestjs/common';
import { AuthResetController } from './auth-reset.controller';
import { SpaceModule } from '@domain/space/space/space.module';
import { UserModule } from '@domain/community/user/user.module';
import { PlatformModule } from '@platform/platfrom/platform.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { TaskModule } from '@services/task/task.module';
import { AccountModule } from '@domain/space/account/account.module';

@Global()
@Module({
  imports: [
    AccountModule,
    SpaceModule,
    UserModule,
    PlatformModule,
    OrganizationModule,
    TaskModule,
  ],
  controllers: [AuthResetController],
})
export class AuthResetSubscriberModule {}
