import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RoleResolverFields } from './role.resolver.fields';
import { RoleService } from './role.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [RoleResolverFields, RoleService],
  exports: [RoleService],
})
export class RoleModule {}
