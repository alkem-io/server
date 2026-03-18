import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { User } from '@domain/community/user/user.entity';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserIdentityService } from './user.identity.service';

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
