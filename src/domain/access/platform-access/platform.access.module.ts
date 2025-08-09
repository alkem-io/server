import { Module } from '@nestjs/common';
import { PlatformAccessService } from './platform.access.service';
import { PlatformModule } from '@platform/platform/platform.module';
import { RoleSetModule } from '../role-set/role.set.module';

@Module({
  imports: [PlatformModule, RoleSetModule],
  providers: [PlatformAccessService],
  exports: [PlatformAccessService],
})
export class PlatformAccessModule {}
