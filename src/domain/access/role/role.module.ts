import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { RoleResolverFields } from './role.resolver.fields';
import { RoleService } from './role.service';

@Module({
  imports: [AuthorizationModule],
  providers: [RoleService, RoleResolverFields],
  exports: [RoleService],
})
export class RoleModule {}
