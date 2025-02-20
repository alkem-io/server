import { Module } from '@nestjs/common';
import { RoleSetCacheService } from './role.set.service.cache';

@Module({
  imports: [],
  providers: [RoleSetCacheService],
  exports: [RoleSetCacheService],
})
export class RoleSetCacheModule {}
