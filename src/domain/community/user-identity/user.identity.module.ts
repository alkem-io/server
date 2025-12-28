import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserIdentityService } from './user.identity.service';
import { User } from '@domain/community/user/user.entity';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    KratosModule,
    UserLookupModule,
    UserModule,
    OrganizationLookupModule,
    RoleSetModule,
  ],
  providers: [UserIdentityService],
  exports: [UserIdentityService],
})
export class UserIdentityModule {}
