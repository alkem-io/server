import { Module } from '@nestjs/common';
import { RoleSetCacheService } from './role.set.service.cache';
import { RoleSetCacheInvalidationService } from './role.set.service.cache.invalidation';

@Module({
  imports: [],
  providers: [RoleSetCacheService, RoleSetCacheInvalidationService],
  exports: [RoleSetCacheService, RoleSetCacheInvalidationService],
})
export class RoleSetCacheModule {}
