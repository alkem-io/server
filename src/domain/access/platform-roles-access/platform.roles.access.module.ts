import { Module } from '@nestjs/common';
import { PlatformRolesAccessService } from './platform.roles.access.service';

@Module({
  imports: [],
  providers: [PlatformRolesAccessService],
  exports: [PlatformRolesAccessService],
})
export class PlatformRolesAccessModule {}
