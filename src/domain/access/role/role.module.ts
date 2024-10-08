import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RoleResolverFields } from './role.resolver.fields';
import { RoleService } from './role.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Role])],
  providers: [RoleService, RoleResolverFields],
  exports: [RoleService],
})
export class RoleModule {}
