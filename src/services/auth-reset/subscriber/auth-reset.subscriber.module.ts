import { Global, Module } from '@nestjs/common';
import { AuthResetController } from './auth-reset.controller';
import { SpaceModule } from '@domain/challenge/space/space.module';
import { UserModule } from '@domain/community/user/user.module';
import { PlatformModule } from '@platform/platfrom/platform.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { TaskModule } from '@services/task/task.module';

@Global()
@Module({
  imports: [
    SpaceModule,
    UserModule,
    PlatformModule,
    OrganizationModule,
    TaskModule,
  ],
  controllers: [AuthResetController],
})
export class AuthResetSubscriberModule {}
